from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import NotificationType


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    message: str
    type: NotificationType
    is_read: bool
    related_project_id: int | None
    related_task_id: int | None
    created_at: datetime
