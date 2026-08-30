from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.ai.service import (
    AIWorkflowError,
    analyze_project_health,
    execute_agent_action,
    generate_task_suggestions,
    propose_agent_action,
)
from app.api.deps import get_current_user, require_pm, require_pm_member, require_project_view
from app.core.config import get_settings
from app.core.database import get_db
from app.models.ai import AIAction, AISuggestion, AISuggestionBatch
from app.models.enums import AgentActionStatus, NotificationType, SuggestionStatus
from app.models.notification import Notification
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.ai import (
    AgentProposeRequest,
    AIActionOut,
    AISuggestionBatchOut,
    AISuggestionOut,
    ApproveSuggestionRequest,
    GenerateTasksRequest,
    ProjectHealthOut,
    SuggestionEdit,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])
settings = get_settings()


def _get_project_or_404(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


def _batch_to_out(batch: AISuggestionBatch) -> AISuggestionBatchOut:
    return AISuggestionBatchOut(
        id=batch.id,
        project_id=batch.project_id,
        requirement_text=batch.requirement_text,
        created_at=batch.created_at,
        suggestions=[AISuggestionOut.model_validate(s) for s in batch.suggestions],
    )


# ---------------------------------------------------------------------------
# Capability 1: Requirement -> Tasks
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/generate-tasks",
    response_model=AISuggestionBatchOut,
    status_code=status.HTTP_201_CREATED,
)
def generate_tasks(
    project_id: int,
    payload: GenerateTasksRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AISuggestionBatchOut:
    project = _get_project_or_404(db, project_id)
    require_pm_member(project_id, db, user)

    try:
        batch = generate_task_suggestions(
            db, project, payload.requirement_text, user.id, settings.anthropic_model
        )
    except AIWorkflowError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    return _batch_to_out(batch)


@router.get("/suggestion-batches/{batch_id}", response_model=AISuggestionBatchOut)
def get_suggestion_batch(
    batch_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> AISuggestionBatchOut:
    batch = db.get(AISuggestionBatch, batch_id)
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Suggestion batch not found")
    require_pm(user)
    require_project_view(batch.project_id, db, user)
    return _batch_to_out(batch)


def _get_suggestion_or_404(db: Session, suggestion_id: int) -> AISuggestion:
    suggestion = db.get(AISuggestion, suggestion_id)
    if suggestion is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Suggestion not found")
    return suggestion


@router.put("/suggestions/{suggestion_id}", response_model=AISuggestionOut)
def edit_suggestion(
    suggestion_id: int,
    payload: SuggestionEdit,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AISuggestionOut:
    suggestion = _get_suggestion_or_404(db, suggestion_id)
    require_pm_member(suggestion.batch.project_id, db, user)

    if suggestion.status in (SuggestionStatus.APPROVED, SuggestionStatus.REJECTED):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This suggestion has already been decided")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(suggestion, field, value)
    suggestion.status = SuggestionStatus.EDITED
    db.commit()
    db.refresh(suggestion)
    return AISuggestionOut.model_validate(suggestion)


@router.delete("/suggestions/{suggestion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_suggestion(
    suggestion_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    suggestion = _get_suggestion_or_404(db, suggestion_id)
    require_pm_member(suggestion.batch.project_id, db, user)
    suggestion.status = SuggestionStatus.REJECTED
    db.commit()


@router.post("/suggestions/{suggestion_id}/approve", response_model=AISuggestionOut)
def approve_suggestion(
    suggestion_id: int,
    payload: ApproveSuggestionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AISuggestionOut:
    suggestion = _get_suggestion_or_404(db, suggestion_id)
    project_id = suggestion.batch.project_id
    require_pm_member(project_id, db, user)

    if suggestion.status in (SuggestionStatus.APPROVED, SuggestionStatus.REJECTED):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This suggestion has already been decided")

    from app.api.deps import get_project_membership

    if get_project_membership(db, project_id, payload.owner_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Owner must be a member of this project")

    start = date.fromisoformat(payload.start_date) if payload.start_date else date.today()
    due = date.fromisoformat(payload.due_date) if payload.due_date else start
    if due < start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "due_date cannot be before start_date")

    task = Task(
        project_id=project_id,
        title=suggestion.title,
        description=suggestion.description,
        owner_id=payload.owner_id,
        priority=suggestion.priority,
        start_date=start,
        due_date=due,
        created_by=user.id,
    )
    db.add(task)
    db.flush()

    suggestion.status = SuggestionStatus.APPROVED
    suggestion.approved_task_id = task.id

    db.add(
        Notification(
            user_id=payload.owner_id,
            message=f'You were assigned to "{task.title}" (AI-suggested task)',
            type=NotificationType.TASK_ASSIGNED,
            related_project_id=project_id,
            related_task_id=task.id,
        )
    )

    db.commit()
    db.refresh(suggestion)
    return AISuggestionOut.model_validate(suggestion)


@router.post("/suggestion-batches/{batch_id}/approve-all", response_model=AISuggestionBatchOut)
def approve_all_suggestions(
    batch_id: int,
    payload: ApproveSuggestionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AISuggestionBatchOut:
    batch = db.get(AISuggestionBatch, batch_id)
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Suggestion batch not found")
    require_pm_member(batch.project_id, db, user)

    from app.api.deps import get_project_membership

    if get_project_membership(db, batch.project_id, payload.owner_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Owner must be a member of this project")

    start = date.fromisoformat(payload.start_date) if payload.start_date else date.today()
    due = date.fromisoformat(payload.due_date) if payload.due_date else start
    if due < start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "due_date cannot be before start_date")

    for suggestion in batch.suggestions:
        if suggestion.status in (SuggestionStatus.APPROVED, SuggestionStatus.REJECTED):
            continue
        task = Task(
            project_id=batch.project_id,
            title=suggestion.title,
            description=suggestion.description,
            owner_id=payload.owner_id,
            priority=suggestion.priority,
            start_date=start,
            due_date=due,
            created_by=user.id,
        )
        db.add(task)
        db.flush()
        suggestion.status = SuggestionStatus.APPROVED
        suggestion.approved_task_id = task.id
        db.add(
            Notification(
                user_id=payload.owner_id,
                message=f'You were assigned to "{task.title}" (AI-suggested task)',
                type=NotificationType.TASK_ASSIGNED,
                related_project_id=batch.project_id,
                related_task_id=task.id,
            )
        )

    db.commit()
    db.refresh(batch)
    return _batch_to_out(batch)


# ---------------------------------------------------------------------------
# Capability 2: Project health
# ---------------------------------------------------------------------------


@router.post("/projects/{project_id}/health", response_model=ProjectHealthOut)
def project_health_analysis(
    project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ProjectHealthOut:
    project = _get_project_or_404(db, project_id)
    require_pm(user)
    require_project_view(project_id, db, user)

    tasks = (
        db.query(Task)
        .options(joinedload(Task.owner))
        .filter(Task.project_id == project_id)
        .all()
    )

    try:
        return analyze_project_health(db, project, tasks, user.id, settings.anthropic_model)
    except AIWorkflowError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc


# ---------------------------------------------------------------------------
# Capability 3: Agentic workflow
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/agent/propose",
    response_model=AIActionOut,
    status_code=status.HTTP_201_CREATED,
)
def propose_agent_change(
    project_id: int,
    payload: AgentProposeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AIActionOut:
    project = _get_project_or_404(db, project_id)
    require_pm_member(project_id, db, user)

    tasks = (
        db.query(Task)
        .options(joinedload(Task.owner))
        .filter(Task.project_id == project_id)
        .all()
    )

    try:
        action = propose_agent_action(
            db, project, tasks, payload.request_text, user.id, settings.anthropic_model
        )
    except AIWorkflowError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    return AIActionOut.model_validate(action)


def _get_action_or_404(db: Session, action_id: int) -> AIAction:
    action = db.get(AIAction, action_id)
    if action is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent action not found")
    return action


@router.get("/agent-actions/{action_id}", response_model=AIActionOut)
def get_agent_action(
    action_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> AIActionOut:
    action = _get_action_or_404(db, action_id)
    require_pm(user)
    require_project_view(action.project_id, db, user)
    return AIActionOut.model_validate(action)


@router.post("/agent-actions/{action_id}/approve", response_model=AIActionOut)
def approve_agent_action(
    action_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> AIActionOut:
    action = _get_action_or_404(db, action_id)
    require_pm_member(action.project_id, db, user)

    if action.status != AgentActionStatus.PROPOSED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This proposal has already been decided")

    from datetime import datetime, timezone

    action.status = AgentActionStatus.APPROVED
    action.decided_at = datetime.now(timezone.utc)
    action.decided_by = user.id
    db.commit()

    execute_agent_action(db, action)
    db.refresh(action)
    return AIActionOut.model_validate(action)


@router.post("/agent-actions/{action_id}/reject", response_model=AIActionOut)
def reject_agent_action(
    action_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> AIActionOut:
    action = _get_action_or_404(db, action_id)
    require_pm_member(action.project_id, db, user)

    if action.status != AgentActionStatus.PROPOSED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This proposal has already been decided")

    from datetime import datetime, timezone

    action.status = AgentActionStatus.REJECTED
    action.decided_at = datetime.now(timezone.utc)
    action.decided_by = user.id
    db.commit()
    db.refresh(action)
    return AIActionOut.model_validate(action)
