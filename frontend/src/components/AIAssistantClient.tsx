"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import {
  Avatar,
  BRAND,
  Button,
  Card,
  ErrorBanner,
  PriorityBadge,
  Spinner,
  inputClass,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/api-client";
import type {
  AIAction,
  AISuggestion,
  AISuggestionBatch,
  ProjectDetail,
  Task,
  TaskPriority,
} from "@/types";

const suggestionStatusStyles: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  EDITED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function SuggestionCard({
  suggestion,
  members,
  onChanged,
}: {
  suggestion: AISuggestion;
  members: { id: number; name: string }[];
  onChanged: (updated: AISuggestion) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [title, setTitle] = useState(suggestion.title);
  const [description, setDescription] = useState(suggestion.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(suggestion.priority);
  const [ownerId, setOwnerId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const decided = suggestion.status === "APPROVED" || suggestion.status === "REJECTED";

  const saveEdit = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.put<AISuggestion>(`/api/ai/suggestions/${suggestion.id}`, {
        title,
        description,
        priority,
      });
      onChanged(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to save edit");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/ai/suggestions/${suggestion.id}`);
      onChanged({ ...suggestion, status: "REJECTED" });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to remove suggestion");
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (ownerId === "" || !startDate || !dueDate) {
      setError("Please select an owner, start date, and due date.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await api.post<AISuggestion>(`/api/ai/suggestions/${suggestion.id}/approve`, {
        owner_id: ownerId,
        start_date: startDate,
        due_date: dueDate,
      });
      onChanged(updated);
      setApproving(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to approve suggestion");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={`p-4 ${decided ? "opacity-70" : ""}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        {editing ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        ) : (
          <p className="font-semibold text-slate-900">{suggestion.title}</p>
        )}
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${suggestionStatusStyles[suggestion.status]}`}>
          {suggestion.status}
        </span>
      </div>

      {editing ? (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} mb-2`}
          rows={2}
        />
      ) : (
        suggestion.description && <p className="mb-2 text-sm text-slate-600">{suggestion.description}</p>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {editing ? (
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputClass}>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        ) : (
          <PriorityBadge priority={suggestion.priority} />
        )}
        {suggestion.suggested_owner_role && <span>Role: {suggestion.suggested_owner_role}</span>}
        {suggestion.estimated_effort && <span>· {suggestion.estimated_effort}</span>}
      </div>

      {suggestion.acceptance_criteria.length > 0 && (
        <ul className="mb-2 list-inside list-disc text-xs text-slate-500">
          {suggestion.acceptance_criteria.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}

      {suggestion.dependencies.length > 0 && (
        <p className="mb-2 text-xs text-slate-400">Depends on: {suggestion.dependencies.join(", ")}</p>
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {!decided && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2">
          {editing ? (
            <>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={busy}>
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setEditing(true)} disabled={busy}>
                Edit
              </Button>
              <Button variant="ghost" onClick={remove} disabled={busy}>
                Remove
              </Button>
              <Button onClick={() => setApproving((v) => !v)} disabled={busy}>
                Approve
              </Button>
            </>
          )}
        </div>
      )}

      {approving && (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select value={ownerId} onChange={(e) => setOwnerId(Number(e.target.value))} className={inputClass}>
              <option value="">Owner…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
          <div className="mt-2 flex justify-end">
            <Button onClick={approve} disabled={busy}>
              {busy ? "Approving…" : "Confirm Approval"}
            </Button>
          </div>
        </div>
      )}

      {suggestion.approved_task_id && (
        <p className="mt-2 text-xs font-medium text-green-700">✓ Created as a real task</p>
      )}
    </Card>
  );
}

function TaskGenerationSection({ projectId, members }: { projectId: number; members: { id: number; name: string }[] }) {
  const [requirement, setRequirement] = useState("");
  const [batch, setBatch] = useState<AISuggestionBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<AISuggestionBatch>(`/api/ai/projects/${projectId}/generate-tasks`, {
        requirement_text: requirement,
      });
      setBatch(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to generate tasks");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    void generate();
  };

  const updateSuggestion = (updated: AISuggestion) => {
    setBatch((prev) =>
      prev ? { ...prev, suggestions: prev.suggestions.map((s) => (s.id === updated.id ? updated : s)) } : prev
    );
  };

  const [showApproveAll, setShowApproveAll] = useState(false);
  const [bulkOwnerId, setBulkOwnerId] = useState<number | "">("");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState("");

  const approveAll = async () => {
    if (!batch) return;
    if (bulkOwnerId === "" || !bulkStartDate || !bulkDueDate) {
      setError("Please select an owner, start date, and due date for the bulk approval.");
      return;
    }
    try {
      const result = await api.post<AISuggestionBatch>(`/api/ai/suggestion-batches/${batch.id}/approve-all`, {
        owner_id: bulkOwnerId,
        start_date: bulkStartDate,
        due_date: bulkDueDate,
      });
      setBatch(result);
      setShowApproveAll(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to approve all suggestions");
    }
  };

  const pendingCount = batch?.suggestions.filter((s) => s.status === "PENDING" || s.status === "EDITED").length ?? 0;

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-semibold text-slate-800">Requirement → Tasks</h2>
      <p className="mb-4 text-sm text-slate-500">
        Describe a requirement in plain language. Claude will break it into structured task suggestions for you to
        review, edit, and approve — nothing is saved as a real task until you approve it.
      </p>

      <form onSubmit={onSubmitGenerate} className="mb-4">
        <textarea
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          className={inputClass}
          rows={3}
          placeholder="e.g. Build customer registration with email OTP and forgot password functionality."
          required
          minLength={3}
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Generating…" : "Generate Tasks"}
          </Button>
        </div>
      </form>

      {loading && <Spinner label="Claude is analyzing your requirement…" />}
      {error && <ErrorBanner message={error} onRetry={generate} />}

      {batch && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">{batch.suggestions.length} suggestion(s)</p>
            {pendingCount > 1 && members.length > 0 && (
              <Button variant="secondary" onClick={() => setShowApproveAll((v) => !v)}>
                Approve All Remaining ({pendingCount})
              </Button>
            )}
          </div>

          {showApproveAll && (
            <div className="mb-3 rounded-2xl bg-slate-50 p-3">
              <p className="mb-2 text-xs text-slate-500">
                Applies the same owner and dates to all {pendingCount} remaining suggestion(s).
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={bulkOwnerId}
                  onChange={(e) => setBulkOwnerId(Number(e.target.value))}
                  className={inputClass}
                >
                  <option value="">Owner…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={(e) => setBulkStartDate(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="date"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Button onClick={approveAll}>Confirm Approve All</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {batch.suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} members={members} onChanged={updateSuggestion} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function AgentSection({
  projectId,
  tasks,
  members,
}: {
  projectId: number;
  tasks: Task[];
  members: { id: number; name: string }[];
}) {
  const [requestText, setRequestText] = useState("");
  const [action, setAction] = useState<AIAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState(false);

  const taskTitle = (id: number) => tasks.find((t) => t.id === id)?.title ?? `Task #${id}`;
  const memberById = (id: number) => members.find((m) => m.id === id);

  const propose = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAction(null);
    try {
      const result = await api.post<AIAction>(`/api/ai/projects/${projectId}/agent/propose`, {
        request_text: requestText,
      });
      setAction(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to generate proposal");
    } finally {
      setLoading(false);
    }
  };

  const decide = async (decision: "approve" | "reject") => {
    if (!action) return;
    setDeciding(true);
    try {
      const result = await api.post<AIAction>(`/api/ai/agent-actions/${action.id}/${decision}`);
      setAction(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : `Failed to ${decision} proposal`);
    } finally {
      setDeciding(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-semibold text-slate-800">Agentic Actions</h2>
      <p className="mb-4 text-sm text-slate-500">
        Describe a change you&apos;d like made across this project&apos;s tasks. The agent proposes specific changes —
        nothing is applied until you approve.
      </p>

      <form onSubmit={propose} className="mb-4">
        <textarea
          value={requestText}
          onChange={(e) => setRequestText(e.target.value)}
          className={inputClass}
          rows={2}
          placeholder="e.g. Move all overdue high-priority tasks to tomorrow."
          required
          minLength={3}
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Planning…" : "Propose Change"}
          </Button>
        </div>
      </form>

      {loading && <Spinner label="Planning the proposal…" />}
      {error && <ErrorBanner message={error} />}

      {action && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                action.status === "EXECUTED"
                  ? "bg-green-100 text-green-700"
                  : action.status === "REJECTED"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {action.status}
            </span>
          </div>
          <p className="mb-3 text-sm text-slate-600">{action.proposal_json.summary}</p>

          {action.proposal_json.changes.length === 0 ? (
            <p className="text-sm text-slate-400">No matching tasks were found for this request.</p>
          ) : (
            <ul className="mb-3 space-y-2">
              {action.proposal_json.changes.map((c, i) => (
                <li key={i} className="rounded-xl bg-white p-2 text-sm">
                  <p className="font-medium text-slate-800">{taskTitle(c.task_id)}</p>
                  <p className="text-slate-500">
                    {c.field}: <span className="line-through">{c.current_value}</span> →{" "}
                    <span className="font-medium text-slate-700">{c.new_value}</span>
                  </p>
                  <p className="text-xs text-slate-400">{c.reason}</p>
                </li>
              ))}
            </ul>
          )}

          {action.impacted_user_ids.length > 0 && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">Impacted resources:</span>
              <div className="flex -space-x-2">
                {action.impacted_user_ids.map((id) => {
                  const m = memberById(id);
                  return m ? <Avatar key={id} user={m} size="sm" ringed /> : null;
                })}
              </div>
            </div>
          )}

          {action.status === "PROPOSED" && (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => decide("reject")} disabled={deciding}>
                Reject
              </Button>
              <Button onClick={() => decide("approve")} disabled={deciding}>
                Approve
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function AIAssistantContent({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve()
      .then(() => setLoading(true))
      .then(() =>
        Promise.all([
          api.get<ProjectDetail>(`/api/projects/${projectId}`),
          api.get<Task[]>(`/api/projects/${projectId}/tasks`),
        ])
      )
      .then(([p, t]) => {
        setProject(p);
        setTasks(t);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load project"))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <Spinner label="Loading…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!project) return null;

  if (user?.role !== "PM") {
    return <ErrorBanner message="Only Project Managers can use the AI Project Assistant." />;
  }

  const members = project.members.map((m) => m.user);

  return (
    <div>
      <Link href={`/projects/${projectId}`} className={`text-sm font-medium ${BRAND.text} hover:underline`}>
        ← {project.name}
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-bold text-slate-900">AI Project Assistant</h1>

      <div className="space-y-6">
        <TaskGenerationSection projectId={projectId} members={members} />
        <AgentSection projectId={projectId} tasks={tasks} members={members} />
      </div>
    </div>
  );
}

export default function AIAssistantClient({ projectId }: { projectId: number }) {
  return (
    <AuthGuard>
      <AIAssistantContent projectId={projectId} />
    </AuthGuard>
  );
}
