from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.user import UserOut


class ProjectMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user: UserOut
    joined_at: datetime


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    start_date: date
    end_date: date
    member_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_dates(self) -> "ProjectCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def check_dates(self) -> "ProjectUpdate":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class ProjectMemberAdd(BaseModel):
    user_id: int


class TaskStats(BaseModel):
    total: int
    todo: int
    in_progress: int
    testing: int
    completed: int
    overdue: int
    completion_percentage: float


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    start_date: date
    end_date: date
    created_by: int
    created_at: datetime
    updated_at: datetime


class ProjectDetailOut(ProjectOut):
    members: list[ProjectMemberOut]
    task_stats: TaskStats
