"""Deterministic dashboard/task statistics.

Per CLAUDE.md's AI architecture principle, none of this is delegated to the
AI — it is plain arithmetic over data already in PostgreSQL.
"""
from datetime import date, timedelta

from app.models.enums import TaskStatus
from app.models.task import Task
from app.schemas.dashboard import DashboardStats
from app.schemas.project import TaskStats


def _week_bounds(today: date) -> tuple[date, date]:
    """Monday..Sunday of the calendar week containing `today`."""
    start = today - timedelta(days=today.weekday())
    end = start + timedelta(days=6)
    return start, end


def is_overdue(task: Task, today: date) -> bool:
    return task.due_date < today and task.status != TaskStatus.COMPLETED


def is_due_this_week(task: Task, today: date) -> bool:
    if task.status == TaskStatus.COMPLETED:
        return False
    start, end = _week_bounds(today)
    return start <= task.due_date <= end


def compute_task_stats(tasks: list[Task], today: date) -> TaskStats:
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
    return TaskStats(
        total=total,
        todo=sum(1 for t in tasks if t.status == TaskStatus.TODO),
        in_progress=sum(1 for t in tasks if t.status == TaskStatus.IN_PROGRESS),
        testing=sum(1 for t in tasks if t.status == TaskStatus.TESTING),
        completed=completed,
        overdue=sum(1 for t in tasks if is_overdue(t, today)),
        completion_percentage=round((completed / total) * 100, 1) if total else 0.0,
    )


def compute_dashboard_stats(tasks: list[Task], today: date) -> DashboardStats:
    return DashboardStats(
        total_tasks=len(tasks),
        completed=sum(1 for t in tasks if t.status == TaskStatus.COMPLETED),
        in_progress=sum(1 for t in tasks if t.status == TaskStatus.IN_PROGRESS),
        delayed=sum(1 for t in tasks if is_overdue(t, today)),
        due_this_week=sum(1 for t in tasks if is_due_this_week(t, today)),
    )
