from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import (
    check_task_update_permission,
    get_current_user,
    get_project_membership,
    get_task_or_404,
    require_pm_member,
    require_project_view,
)
from app.core.database import get_db
from app.models.enums import NotificationType
from app.models.notification import Notification
from app.models.project import Project
from app.models.task import Task, TaskDependency
from app.models.user import User
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(tags=["tasks"])


def _get_project_or_404(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


def _load_task(db: Session, task_id: int) -> Task:
    task = (
        db.query(Task)
        .options(joinedload(Task.owner))
        .filter(Task.id == task_id)
        .first()
    )
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return task


@router.post(
    "/api/projects/{project_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED
)
def create_task(
    project_id: int,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TaskOut:
    _get_project_or_404(db, project_id)
    require_pm_member(project_id, db, user)

    if get_project_membership(db, project_id, payload.owner_id) is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Owner must be a member of this project"
        )

    for dep_id in payload.depends_on_task_ids:
        dep_task = db.get(Task, dep_id)
        if dep_task is None or dep_task.project_id != project_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"Dependency task {dep_id} not found in this project"
            )

    task = Task(
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        owner_id=payload.owner_id,
        priority=payload.priority,
        status=payload.status,
        start_date=payload.start_date,
        due_date=payload.due_date,
        created_by=user.id,
    )
    db.add(task)
    db.flush()

    for dep_id in payload.depends_on_task_ids:
        db.add(TaskDependency(task_id=task.id, depends_on_task_id=dep_id))

    db.add(
        Notification(
            user_id=payload.owner_id,
            message=f'You were assigned to "{task.title}"',
            type=NotificationType.TASK_ASSIGNED,
            related_project_id=project_id,
            related_task_id=task.id,
        )
    )

    db.commit()
    db.refresh(task)
    task = _load_task(db, task.id)
    return TaskOut.from_model(task, date.today())


@router.get("/api/projects/{project_id}/tasks", response_model=list[TaskOut])
def list_project_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TaskOut]:
    _get_project_or_404(db, project_id)
    require_project_view(project_id, db, user)

    tasks = (
        db.query(Task)
        .options(joinedload(Task.owner))
        .filter(Task.project_id == project_id)
        .order_by(Task.created_at)
        .all()
    )
    today = date.today()
    return [TaskOut.from_model(t, today) for t in tasks]


@router.get("/api/tasks/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> TaskOut:
    task = _load_task(db, task_id)
    require_project_view(task.project_id, db, user)
    return TaskOut.from_model(task, date.today())


@router.patch("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TaskOut:
    task = get_task_or_404(db, task_id)
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields provided to update")

    check_task_update_permission(task, user, db, set(data.keys()))

    if "owner_id" in data and get_project_membership(db, task.project_id, data["owner_id"]) is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Owner must be a member of this project"
        )

    new_start = data.get("start_date", task.start_date)
    new_due = data.get("due_date", task.due_date)
    if new_due < new_start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "due_date cannot be before start_date")

    reassigned = "owner_id" in data and data["owner_id"] != task.owner_id
    for field, value in data.items():
        setattr(task, field, value)

    if reassigned:
        db.add(
            Notification(
                user_id=data["owner_id"],
                message=f'You were assigned to "{task.title}"',
                type=NotificationType.TASK_ASSIGNED,
                related_project_id=task.project_id,
                related_task_id=task.id,
            )
        )

    db.commit()
    task = _load_task(db, task_id)
    return TaskOut.from_model(task, date.today())


@router.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    task = get_task_or_404(db, task_id)
    require_pm_member(task.project_id, db, user)
    db.delete(task)
    db.commit()
