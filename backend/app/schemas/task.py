from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import TaskPriority, TaskStatus
from app.schemas.user import UserOut


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    owner_id: int
    priority: TaskPriority
    status: TaskStatus = TaskStatus.TODO
    start_date: date
    due_date: date
    depends_on_task_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_dates(self) -> "TaskCreate":
        if self.due_date < self.start_date:
            raise ValueError("due_date cannot be before start_date")
        return self


class TaskUpdate(BaseModel):
    """All fields optional — PATCH semantics. Backend enforces which fields a
    given caller is actually allowed to change (see app/api/deps.py)."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    owner_id: int | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    start_date: date | None = None
    due_date: date | None = None

    @model_validator(mode="after")
    def check_dates(self) -> "TaskUpdate":
        if self.start_date and self.due_date and self.due_date < self.start_date:
            raise ValueError("due_date cannot be before start_date")
        return self


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str | None
    owner: UserOut | None
    priority: TaskPriority
    status: TaskStatus
    start_date: date
    due_date: date
    created_by: int
    created_at: datetime
    updated_at: datetime
    is_overdue: bool = False

    @staticmethod
    def from_model(task, today: date) -> "TaskOut":
        out = TaskOut.model_validate(task)
        out.is_overdue = task.due_date < today and task.status != TaskStatus.COMPLETED
        return out
