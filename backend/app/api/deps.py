from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.enums import UserRole
from app.models.project import ProjectMember
from app.models.task import Task
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user


def require_pm(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.PM:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Project Manager role required")
    return user


def get_project_membership(db: Session, project_id: int, user_id: int) -> ProjectMember | None:
    return (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .first()
    )


def require_project_member(project_id: int, db: Session, user: User) -> None:
    if get_project_membership(db, project_id, user.id) is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this project")


def require_project_view(project_id: int, db: Session, user: User) -> None:
    """Read-only access: any PM may view any project (org-wide oversight,
    matching the global dashboard's PM-sees-everything stats); a Team Member
    may only view projects they belong to."""
    if user.role == UserRole.PM:
        return
    require_project_member(project_id, db, user)


def require_pm_member(project_id: int, db: Session, user: User) -> None:
    """PM role AND a member of this specific project — required to manage it."""
    if user.role != UserRole.PM:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Project Manager role required")
    require_project_member(project_id, db, user)


def get_task_or_404(db: Session, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return task


def check_task_update_permission(task: Task, user: User, db: Session, fields: set[str]) -> None:
    """PM members of the task's project may change any field. Team members may
    only change status/description, and only on tasks they own."""
    membership = get_project_membership(db, task.project_id, user.id)
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this project")

    if user.role == UserRole.PM:
        return

    if task.owner_id != user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Team members may only update tasks they own"
        )

    allowed_fields = {"status", "description"}
    disallowed = fields - allowed_fields
    if disallowed:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Team members cannot modify: {', '.join(sorted(disallowed))}",
        )
