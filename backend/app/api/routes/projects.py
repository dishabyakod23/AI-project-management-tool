from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_pm, require_pm_member, require_project_view
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectDetailOut,
    ProjectMemberAdd,
    ProjectMemberOut,
    ProjectOut,
    ProjectUpdate,
)
from app.services.stats_service import compute_task_stats

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _to_detail(project: Project) -> ProjectDetailOut:
    return ProjectDetailOut(
        id=project.id,
        name=project.name,
        description=project.description,
        start_date=project.start_date,
        end_date=project.end_date,
        created_by=project.created_by,
        created_at=project.created_at,
        updated_at=project.updated_at,
        members=[ProjectMemberOut.model_validate(m) for m in project.members],
        task_stats=compute_task_stats(project.tasks, date.today()),
    )


@router.post("", response_model=ProjectDetailOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_pm),
) -> ProjectDetailOut:
    if payload.member_ids:
        found = db.query(User.id).filter(User.id.in_(payload.member_ids)).count()
        if found != len(set(payload.member_ids)):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "One or more member_ids do not exist")

    project = Project(
        name=payload.name,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        created_by=user.id,
    )
    db.add(project)
    db.flush()

    member_ids = set(payload.member_ids) | {user.id}
    for member_id in member_ids:
        db.add(ProjectMember(project_id=project.id, user_id=member_id))

    db.commit()
    db.refresh(project)
    return _to_detail(project)


@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[ProjectOut]:
    if user.role == UserRole.PM:
        projects = db.query(Project).order_by(Project.created_at.desc()).all()
    else:
        projects = (
            db.query(Project)
            .join(ProjectMember, ProjectMember.project_id == Project.id)
            .filter(ProjectMember.user_id == user.id)
            .order_by(Project.created_at.desc())
            .all()
        )
    return [ProjectOut.model_validate(p) for p in projects]


def _get_project_or_404(db: Session, project_id: int) -> Project:
    project = (
        db.query(Project)
        .options(joinedload(Project.members).joinedload(ProjectMember.user))
        .filter(Project.id == project_id)
        .first()
    )
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


@router.get("/{project_id}", response_model=ProjectDetailOut)
def get_project(
    project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ProjectDetailOut:
    project = _get_project_or_404(db, project_id)
    require_project_view(project_id, db, user)
    return _to_detail(project)


@router.put("/{project_id}", response_model=ProjectDetailOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectDetailOut:
    project = _get_project_or_404(db, project_id)
    require_pm_member(project_id, db, user)

    data = payload.model_dump(exclude_unset=True)
    new_start = data.get("start_date", project.start_date)
    new_end = data.get("end_date", project.end_date)
    if new_end < new_start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "end_date cannot be before start_date")

    for field, value in data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return _to_detail(project)


@router.post("/{project_id}/members", response_model=ProjectDetailOut)
def add_member(
    project_id: int,
    payload: ProjectMemberAdd,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectDetailOut:
    project = _get_project_or_404(db, project_id)
    require_pm_member(project_id, db, user)

    target = db.get(User, payload.user_id)
    if target is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User does not exist")

    existing = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == payload.user_id)
        .first()
    )
    if existing is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User is already a member")

    db.add(ProjectMember(project_id=project_id, user_id=payload.user_id))
    db.commit()
    db.refresh(project)
    return _to_detail(project)


@router.delete("/{project_id}/members/{user_id}", response_model=ProjectDetailOut)
def remove_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectDetailOut:
    project = _get_project_or_404(db, project_id)
    require_pm_member(project_id, db, user)

    membership = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .first()
    )
    if membership is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membership not found")

    db.delete(membership)
    db.commit()
    db.refresh(project)
    return _to_detail(project)
