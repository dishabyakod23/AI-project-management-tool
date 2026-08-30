from __future__ import annotations

from datetime import date, datetime, timezone

import pydantic
from sqlalchemy.orm import Session

from app.ai.client import AICallResult, AIProviderError, call_structured
from app.ai.prompts import agent_planning, project_health, task_generation
from app.models.ai import AIAction, AILog, AISuggestion, AISuggestionBatch
from app.models.enums import AgentActionStatus, AIWorkflowType, NotificationType, TaskStatus
from app.models.notification import Notification
from app.models.project import Project
from app.models.task import Task
from app.schemas.ai import (
    AgentProposalRaw,
    ProjectHealthOut,
    ProjectHealthRaw,
    TaskGenerationRaw,
)
from app.services.stats_service import is_overdue


class AIWorkflowError(Exception):
    """User-facing error for an AI workflow failure (provider issue or invalid output)."""


def _log_call(
    db: Session,
    workflow_type: AIWorkflowType,
    user_id: int,
    project_id: int | None,
    model: str,
    result: AICallResult | None,
    started_at: datetime,
    success: bool,
    validation_passed: bool | None,
    error_message: str | None,
) -> None:
    completed_at = result.completed_at if result else datetime.now(timezone.utc)
    db.add(
        AILog(
            workflow_type=workflow_type,
            user_id=user_id,
            project_id=project_id,
            request_started_at=started_at,
            response_completed_at=completed_at,
            duration_ms=result.duration_ms if result else None,
            model=model,
            input_tokens=result.input_tokens if result else None,
            output_tokens=result.output_tokens if result else None,
            success=success,
            validation_passed=validation_passed,
            error_message=(error_message or "")[:2000] or None,
        )
    )
    db.commit()


# ---------------------------------------------------------------------------
# Capability 1: Requirement -> structured task suggestions
# ---------------------------------------------------------------------------


def generate_task_suggestions(
    db: Session, project: Project, requirement_text: str, user_id: int, model: str
) -> AISuggestionBatch:
    started_at = datetime.now(timezone.utc)
    system_prompt = task_generation.SYSTEM_PROMPT
    user_prompt = task_generation.build_user_prompt(requirement_text, project.name)

    try:
        result = call_structured(system_prompt, user_prompt, TaskGenerationRaw)
    except AIProviderError as exc:
        _log_call(db, AIWorkflowType.TASK_GENERATION, user_id, project.id, model, None, started_at, False, None, str(exc))
        raise AIWorkflowError(str(exc)) from exc

    try:
        parsed: TaskGenerationRaw = result.parsed  # type: ignore[assignment]
        if parsed is None or not parsed.tasks:
            raise ValueError("AI returned no tasks")
    except (pydantic.ValidationError, ValueError) as exc:
        _log_call(
            db, AIWorkflowType.TASK_GENERATION, user_id, project.id, model, result, started_at,
            False, False, f"Invalid AI output: {exc}",
        )
        raise AIWorkflowError(
            "The AI did not return a valid task list. Please try again or rephrase the requirement."
        ) from exc

    batch = AISuggestionBatch(project_id=project.id, requirement_text=requirement_text, created_by=user_id)
    db.add(batch)
    db.flush()

    for raw_task in parsed.tasks:
        db.add(
            AISuggestion(
                batch_id=batch.id,
                title=raw_task.title,
                description=raw_task.description,
                priority=raw_task.priority,
                suggested_owner_role=raw_task.suggested_owner_role,
                estimated_effort=raw_task.estimated_effort,
                dependencies=raw_task.dependencies,
                acceptance_criteria=raw_task.acceptance_criteria,
            )
        )

    _log_call(db, AIWorkflowType.TASK_GENERATION, user_id, project.id, model, result, started_at, True, True, None)
    db.commit()
    db.refresh(batch)
    return batch


# ---------------------------------------------------------------------------
# Capability 2: Project health analysis
# ---------------------------------------------------------------------------


def _build_health_facts(tasks: list[Task], today: date) -> dict:
    total = len(tasks)
    overdue = [t for t in tasks if is_overdue(t, today)]
    high_priority_overdue = [t for t in overdue if t.priority.value == "HIGH"]
    return {
        "total_tasks": total,
        "completed": sum(1 for t in tasks if t.status == TaskStatus.COMPLETED),
        "in_progress": sum(1 for t in tasks if t.status == TaskStatus.IN_PROGRESS),
        "testing": sum(1 for t in tasks if t.status == TaskStatus.TESTING),
        "to_do": sum(1 for t in tasks if t.status == TaskStatus.TODO),
        "overdue": len(overdue),
        "high_priority_overdue": len(high_priority_overdue),
    }


def analyze_project_health(db: Session, project: Project, tasks: list[Task], user_id: int, model: str) -> ProjectHealthOut:
    today = date.today()
    facts = _build_health_facts(tasks, today)
    task_lines = [
        f"- \"{t.title}\" — {t.priority.value} — {t.status.value} — due {t.due_date.isoformat()}"
        f"{' (OVERDUE)' if is_overdue(t, today) else ''} — owner: {t.owner.name if t.owner else 'unassigned'}"
        for t in tasks
    ]

    started_at = datetime.now(timezone.utc)
    system_prompt = project_health.SYSTEM_PROMPT
    user_prompt = project_health.build_user_prompt(project.name, facts, task_lines)

    try:
        result = call_structured(system_prompt, user_prompt, ProjectHealthRaw)
    except AIProviderError as exc:
        _log_call(db, AIWorkflowType.PROJECT_HEALTH, user_id, project.id, model, None, started_at, False, None, str(exc))
        raise AIWorkflowError(str(exc)) from exc

    parsed: ProjectHealthRaw | None = result.parsed  # type: ignore[assignment]
    if parsed is None:
        _log_call(
            db, AIWorkflowType.PROJECT_HEALTH, user_id, project.id, model, result, started_at,
            False, False, "AI returned no parsable health analysis",
        )
        raise AIWorkflowError("The AI did not return a valid health analysis. Please try again.")

    # Grounding check: every risk must reference a real task title from this project.
    known_titles = {t.title.lower() for t in tasks}
    grounded_risks = [
        r for r in parsed.risks if any(title in r.evidence.lower() or title in r.title.lower() for title in known_titles)
        or not tasks  # empty project: nothing to ground against, allow general commentary
    ]

    _log_call(db, AIWorkflowType.PROJECT_HEALTH, user_id, project.id, model, result, started_at, True, True, None)
    db.commit()

    return ProjectHealthOut(
        health=parsed.health,
        summary=parsed.summary,
        risks=grounded_risks,
        recommended_actions=parsed.recommended_actions,
        objective_facts=facts,
    )


# ---------------------------------------------------------------------------
# Capability 3 (stretch): Agentic proposal
# ---------------------------------------------------------------------------


def propose_agent_action(
    db: Session, project: Project, tasks: list[Task], request_text: str, user_id: int, model: str
) -> AIAction:
    candidate_lines = [
        f"{t.id} | {t.title} | {t.status.value} | {t.priority.value} | {t.due_date.isoformat()} | "
        f"{t.owner_id or 'null'} | {t.owner.name if t.owner else 'unassigned'}"
        for t in tasks
    ]

    started_at = datetime.now(timezone.utc)
    system_prompt = agent_planning.SYSTEM_PROMPT
    user_prompt = agent_planning.build_user_prompt(project.name, request_text, candidate_lines)

    try:
        result = call_structured(system_prompt, user_prompt, AgentProposalRaw)
    except AIProviderError as exc:
        _log_call(db, AIWorkflowType.AGENT_PLANNING, user_id, project.id, model, None, started_at, False, None, str(exc))
        raise AIWorkflowError(str(exc)) from exc

    parsed: AgentProposalRaw | None = result.parsed  # type: ignore[assignment]
    if parsed is None:
        _log_call(
            db, AIWorkflowType.AGENT_PLANNING, user_id, project.id, model, result, started_at,
            False, False, "AI returned no parsable proposal",
        )
        raise AIWorkflowError("The AI did not return a valid proposal. Please try again.")

    # Validate every referenced task_id/owner actually belongs to this project's candidate set.
    valid_task_ids = {t.id for t in tasks}
    valid_owner_ids = {t.owner_id for t in tasks if t.owner_id is not None}
    safe_changes = [c for c in parsed.changes if c.task_id in valid_task_ids]
    safe_impacted = [uid for uid in parsed.impacted_user_ids if uid in valid_owner_ids]

    action = AIAction(
        project_id=project.id,
        requested_by=user_id,
        request_text=request_text,
        proposal_json={
            "summary": parsed.summary,
            "changes": [c.model_dump() for c in safe_changes],
        },
        impacted_user_ids=safe_impacted,
        status=AgentActionStatus.PROPOSED,
    )
    db.add(action)

    _log_call(db, AIWorkflowType.AGENT_PLANNING, user_id, project.id, model, result, started_at, True, True, None)
    db.commit()
    db.refresh(action)
    return action


def execute_agent_action(db: Session, action: AIAction) -> None:
    """Apply an approved agent proposal. Caller has already checked status == APPROVED."""
    for change in action.proposal_json.get("changes", []):
        task = db.get(Task, change["task_id"])
        if task is None:
            continue
        field = change["field"]
        new_value = change["new_value"]
        if field == "due_date":
            task.due_date = date.fromisoformat(new_value)
        elif field == "status":
            task.status = TaskStatus(new_value)
        elif field == "priority":
            from app.models.enums import TaskPriority

            task.priority = TaskPriority(new_value)
        elif field == "owner_id":
            task.owner_id = int(new_value)

    for user_id in action.impacted_user_ids:
        db.add(
            Notification(
                user_id=user_id,
                message=f'An agentic action was applied to project "{action.request_text[:80]}"',
                type=NotificationType.AGENT_ACTION_EXECUTED,
                related_project_id=action.project_id,
            )
        )

    action.status = AgentActionStatus.EXECUTED
    action.executed_at = datetime.now(timezone.utc)
    db.commit()
