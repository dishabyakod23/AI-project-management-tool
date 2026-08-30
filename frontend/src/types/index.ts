export type UserRole = "PM" | "MEMBER";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "TESTING" | "COMPLETED";
export type SuggestionStatus = "PENDING" | "EDITED" | "APPROVED" | "REJECTED";
export type AgentActionStatus = "PROPOSED" | "APPROVED" | "REJECTED" | "EXECUTED";
export type HealthRating = "GREEN" | "AMBER" | "RED";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface ProjectMember {
  user: User;
  joined_at: string;
}

export interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  testing: number;
  completed: number;
  overdue: number;
  completion_percentage: number;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  task_stats: TaskStats;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  owner: User | null;
  priority: TaskPriority;
  status: TaskStatus;
  start_date: string;
  due_date: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
}

export interface DashboardStats {
  total_tasks: number;
  completed: number;
  in_progress: number;
  delayed: number;
  due_this_week: number;
}

export interface AISuggestion {
  id: number;
  batch_id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  suggested_owner_role: string | null;
  estimated_effort: string | null;
  dependencies: string[];
  acceptance_criteria: string[];
  status: SuggestionStatus;
  approved_task_id: number | null;
}

export interface AISuggestionBatch {
  id: number;
  project_id: number;
  requirement_text: string;
  created_at: string;
  suggestions: AISuggestion[];
}

export interface HealthRisk {
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  evidence: string;
}

export interface HealthAction {
  action: string;
  reason: string;
}

export interface ProjectHealth {
  health: HealthRating;
  summary: string;
  risks: HealthRisk[];
  recommended_actions: HealthAction[];
  objective_facts: Record<string, number>;
}

export interface AgentProposedChange {
  task_id: number;
  field: string;
  current_value: string;
  new_value: string;
  reason: string;
}

export interface AIAction {
  id: number;
  project_id: number;
  request_text: string;
  proposal_json: { summary: string; changes: AgentProposedChange[] };
  impacted_user_ids: number[];
  status: AgentActionStatus;
  created_at: string;
  decided_at: string | null;
  executed_at: string | null;
}

export interface Notification {
  id: number;
  message: string;
  type: string;
  is_read: boolean;
  related_project_id: number | null;
  related_task_id: number | null;
  created_at: string;
}

export interface ApiError {
  detail: string | { msg: string; loc: (string | number)[] }[];
}
