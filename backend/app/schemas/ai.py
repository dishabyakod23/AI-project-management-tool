from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SuggestionStatus, TaskPriority

# ---------------------------------------------------------------------------
# Raw shapes Claude is asked to return. These are the contract the backend
# validates AI output against before anything touches the database.
# ---------------------------------------------------------------------------


class RawTaskSuggestion(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    priority: TaskPriority
    suggested_owner_role: str | None = None
    estimated_effort: str | None = None
    dependencies: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)


class TaskGenerationRaw(BaseModel):
    tasks: list[RawTaskSuggestion]


class GenerateTasksRequest(BaseModel):
    requirement_text: str = Field(min_length=3, max_length=4000)


class RawHealthRisk(BaseModel):
    title: str
    severity: Literal["LOW", "MEDIUM", "HIGH"]
    evidence: str


class RawHealthAction(BaseModel):
    action: str
    reason: str


class ProjectHealthRaw(BaseModel):
    health: Literal["GREEN", "AMBER", "RED"]
    summary: str
    risks: list[RawHealthRisk] = Field(default_factory=list)
    recommended_actions: list[RawHealthAction] = Field(default_factory=list)


class RawAgentProposedChange(BaseModel):
    task_id: int
    field: Literal["due_date", "status", "priority", "owner_id"]
    current_value: str
    new_value: str
    reason: str


class AgentProposalRaw(BaseModel):
    summary: str
    changes: list[RawAgentProposedChange] = Field(default_factory=list)
    impacted_user_ids: list[int] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Persisted / API-facing shapes
# ---------------------------------------------------------------------------


class AISuggestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    batch_id: int
    title: str
    description: str | None
    priority: TaskPriority
    suggested_owner_role: str | None
    estimated_effort: str | None
    dependencies: list[str]
    acceptance_criteria: list[str]
    status: SuggestionStatus
    approved_task_id: int | None


class AISuggestionBatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    requirement_text: str
    created_at: datetime
    suggestions: list[AISuggestionOut]


class SuggestionEdit(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    priority: TaskPriority | None = None
    suggested_owner_role: str | None = None
    estimated_effort: str | None = None
    acceptance_criteria: list[str] | None = None


class ApproveSuggestionRequest(BaseModel):
    owner_id: int
    start_date: str | None = None
    due_date: str | None = None


class ProjectHealthOut(BaseModel):
    health: Literal["GREEN", "AMBER", "RED"]
    summary: str
    risks: list[RawHealthRisk]
    recommended_actions: list[RawHealthAction]
    objective_facts: dict


class AgentProposeRequest(BaseModel):
    request_text: str = Field(min_length=3, max_length=2000)


class AIActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    request_text: str
    proposal_json: dict
    impacted_user_ids: list[int]
    status: str
    created_at: datetime
    decided_at: datetime | None
    executed_at: datetime | None
