"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import {
  BRAND,
  Button,
  Card,
  ErrorBanner,
  Field,
  PriorityBadge,
  Spinner,
  StatusBadge,
  inputClass,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/api-client";
import type { ProjectDetail, Task, TaskPriority, TaskStatus } from "@/types";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "TESTING", "COMPLETED"];
const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

function TaskDetailContent({ projectId, taskId }: { projectId: number; taskId: number }) {
  const { user } = useAuth();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<number | "">("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<Task>(`/api/tasks/${taskId}`),
      api.get<ProjectDetail>(`/api/projects/${projectId}`),
    ])
      .then(([t, p]) => {
        setTask(t);
        setProject(p);
        setTitle(t.title);
        setDescription(t.description ?? "");
        setOwnerId(t.owner?.id ?? "");
        setPriority(t.priority);
        setStatus(t.status);
        setStartDate(t.start_date);
        setDueDate(t.due_date);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load task"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [projectId, taskId]);

  if (loading) return <Spinner label="Loading task…" />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!task || !project) return null;

  const isPm = user?.role === "PM";
  const isOwner = task.owner?.id === user?.id;
  const canEditAll = isPm;
  const canEditLimited = !isPm && isOwner;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const payload = canEditAll
        ? {
            title,
            description,
            owner_id: ownerId,
            priority,
            status,
            start_date: startDate,
            due_date: dueDate,
          }
        : { description, status };
      const updated = await api.patch<Task>(`/api/tasks/${taskId}`, payload);
      setTask(updated);
    } catch (err) {
      setSaveError(err instanceof ApiClientError ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async () => {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    try {
      await api.delete(`/api/tasks/${taskId}`);
      router.push(`/projects/${projectId}/board`);
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : "Failed to delete task");
    }
  };

  const readOnly = !canEditAll && !canEditLimited;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/projects/${projectId}/board`} className={`text-sm font-medium ${BRAND.text} hover:underline`}>
        ← Task Board
      </Link>

      <Card className="mt-3 p-6">
        <div className="mb-4 flex items-center gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.is_overdue && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
              Overdue
            </span>
          )}
        </div>

        <form onSubmit={save}>
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEditAll}
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              className={inputClass}
              rows={4}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner">
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(Number(e.target.value))}
                disabled={!canEditAll}
                className={inputClass}
              >
                {project.members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={!canEditAll}
                className={inputClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={readOnly}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!canEditAll}
                className={inputClass}
              />
            </Field>
          </div>

          {saveError && <p className="mb-3 text-sm text-red-600">{saveError}</p>}

          <div className="flex items-center justify-between pt-2">
            <div>
              {isPm && (
                <Button type="button" variant="danger" onClick={deleteTask}>
                  Delete Task
                </Button>
              )}
            </div>
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function TaskDetailClient({ projectId, taskId }: { projectId: number; taskId: number }) {
  return (
    <AuthGuard>
      <TaskDetailContent projectId={projectId} taskId={taskId} />
    </AuthGuard>
  );
}
