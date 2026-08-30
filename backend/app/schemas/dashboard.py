from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_tasks: int
    completed: int
    in_progress: int
    delayed: int
    due_this_week: int
