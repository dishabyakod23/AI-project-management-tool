from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AgentActionStatus, AIWorkflowType, SuggestionStatus, TaskPriority


class AISuggestionBatch(Base):
    """One requirement submission from a PM; groups the individual suggestions Claude returned."""

    __tablename__ = "ai_suggestion_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    requirement_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default="now()")

    suggestions = relationship(
        "AISuggestion", back_populates="batch", cascade="all, delete-orphan"
    )


class AISuggestion(Base):
    """A single AI-proposed task, pending PM review/edit/approval before it becomes a real Task."""

    __tablename__ = "ai_suggestions"

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int] = mapped_column(
        ForeignKey("ai_suggestion_batches.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority, name="task_priority"))
    suggested_owner_role: Mapped[str | None] = mapped_column(String(255))
    estimated_effort: Mapped[str | None] = mapped_column(String(100))
    dependencies: Mapped[list | None] = mapped_column(JSONB, default=list)
    acceptance_criteria: Mapped[list | None] = mapped_column(JSONB, default=list)
    status: Mapped[SuggestionStatus] = mapped_column(
        Enum(SuggestionStatus, name="suggestion_status"),
        nullable=False,
        default=SuggestionStatus.PENDING,
    )
    approved_task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )

    batch = relationship("AISuggestionBatch", back_populates="suggestions")


class AIAction(Base):
    """An agentic proposal (e.g. reschedule overdue tasks) awaiting PM approve/reject."""

    __tablename__ = "ai_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    requested_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    request_text: Mapped[str] = mapped_column(Text, nullable=False)
    proposal_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    impacted_user_ids: Mapped[list] = mapped_column(JSONB, default=list)
    status: Mapped[AgentActionStatus] = mapped_column(
        Enum(AgentActionStatus, name="agent_action_status"),
        nullable=False,
        default=AgentActionStatus.PROPOSED,
    )
    created_at: Mapped[datetime] = mapped_column(server_default="now()")
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    decided_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class AILog(Base):
    """Lightweight AI observability record — one row per AI provider call."""

    __tablename__ = "ai_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    workflow_type: Mapped[AIWorkflowType] = mapped_column(
        Enum(AIWorkflowType, name="ai_workflow_type"), nullable=False
    )
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    request_started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    response_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    validation_passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default="now()")
