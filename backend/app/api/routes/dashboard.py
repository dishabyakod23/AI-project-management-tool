from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_project_view
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.project import Project, ProjectMember
from app.models.task import Task
from app.models.user import User
from app.schemas.dashboard import DashboardStats
from app.services.stats_service import compute_dashboard_stats

router = APIRouter(tags=["dashboard"])


@router.get("/api/dashboard", response_model=DashboardStats)
def global_dashboard(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DashboardStats:
    if user.role == UserRole.PM:
        project_ids = [p.id for p in db.query(Project.id).all()]
    else:
        project_ids = [
            m.project_id
            for m in db.query(ProjectMember.project_id)
            .filter(ProjectMember.user_id == user.id)
            .all()
        ]

    if not project_ids:
        tasks: list[Task] = []
    else:
        tasks = db.query(Task).filter(Task.project_id.in_(project_ids)).all()

    return compute_dashboard_stats(tasks, date.today())


@router.get("/api/projects/{project_id}/dashboard", response_model=DashboardStats)
def project_dashboard(
    project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DashboardStats:
    if db.get(Project, project_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    require_project_view(project_id, db, user)

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return compute_dashboard_stats(tasks, date.today())
