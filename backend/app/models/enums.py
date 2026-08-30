import enum


class UserRole(str, enum.Enum):
    PM = "PM"
    MEMBER = "MEMBER"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    TESTING = "TESTING"
    COMPLETED = "COMPLETED"


class SuggestionStatus(str, enum.Enum):
    PENDING = "PENDING"
    EDITED = "EDITED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AgentActionStatus(str, enum.Enum):
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AIWorkflowType(str, enum.Enum):
    TASK_GENERATION = "TASK_GENERATION"
    PROJECT_HEALTH = "PROJECT_HEALTH"
    AGENT_PLANNING = "AGENT_PLANNING"


class NotificationType(str, enum.Enum):
    TASK_ASSIGNED = "TASK_ASSIGNED"
    TASK_UPDATED = "TASK_UPDATED"
    AI_SUGGESTIONS_READY = "AI_SUGGESTIONS_READY"
    AGENT_ACTION_EXECUTED = "AGENT_ACTION_EXECUTED"
