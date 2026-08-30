"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import {
  Avatar,
  BRAND,
  Button,
  ErrorBanner,
  Field,
  PriorityBadge,
  Spinner,
  inputClass,
  statusLabels,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/api-client";
import type { ProjectDetail, Task, TaskPriority, TaskStatus, User } from "@/types";

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "TESTING", "COMPLETED"];

function CreateTaskModal({
  projectId,
  members,
  onClose,
  onCreated,
}: {
  projectId: number;
  members: User[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<number | "">("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerId === "") {
      setError("Please select an owner.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/api/projects/${projectId}/tasks`, {
        title,
        description,
        owner_id: ownerId,
        priority,
        status: "TODO",
        start_date: startDate,
        due_date: dueDate,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-white/70 bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold text-stone-950">New Task</h2>
        <form onSubmit={submit}>
          <Field label="Title">
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner">
              <select
                required
                value={ownerId}
                onChange={(e) => setOwnerId(Number(e.target.value))}
                className={inputClass}
              >
                <option value="">Select…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={inputClass}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </Field>
            <Field label="Start Date">
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  draggable,
  onDragStart,
}: {
  task: Task;
  draggable: boolean;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}) {
  return (
    <Link href={`/projects/${task.project_id}/tasks/${task.id}`}>
      <div
        draggable={draggable}
        onDragStart={(e) => onDragStart(e, task)}
        className={`mb-2.5 rounded-xl border border-black/5 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(31,41,55,0.10)] ${
          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        } ${task.is_overdue ? "ring-1 ring-rose-200" : ""}`}
      >
        <div className="flex items-center justify-between">
          <PriorityBadge priority={task.priority} />
          {task.owner && <Avatar user={task.owner} size="sm" />}
        </div>
        <p className="mt-3 text-sm font-bold leading-snug text-stone-900">{task.title}</p>
        <span className={`mt-2 block text-xs ${task.is_overdue ? "font-semibold text-rose-600" : "text-stone-400"}`}>
          {task.is_overdue ? "Overdue - " : "Due "}
          {task.due_date}
        </span>
      </div>
    </Link>
  );
}

function TaskBoardContent({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL");

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<ProjectDetail>(`/api/projects/${projectId}`),
      api.get<Task[]>(`/api/projects/${projectId}/tasks`),
    ])
      .then(([p, t]) => {
        setProject(p);
        setTasks(t);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load task board"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [projectId]);

  const canDrag = (task: Task) => user?.role === "PM" || task.owner?.id === user?.id;

  const onDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData("text/plain", String(task.id));
  };

  const onDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("text/plain"));
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    setBoardError(null);

    try {
      const updated = await api.patch<Task>(`/api/tasks/${taskId}`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      setTasks(previous); // revert UI state on failure, per spec
      setBoardError(err instanceof ApiClientError ? err.message : "Failed to move task — reverted.");
    }
  };

  if (loading) return <Spinner label="Loading task board…" />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!project) return null;

  const visibleTasks = tasks.filter((task) => {
    const matchesQuery = `${task.title} ${task.description ?? ""} ${task.owner?.name ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesPriority = priorityFilter === "ALL" || task.priority === priorityFilter;
    return matchesQuery && matchesPriority;
  });

  const activeCount = tasks.filter((t) => t.status !== "COMPLETED").length;
  const overdueCount = tasks.filter((t) => t.is_overdue && t.status !== "COMPLETED").length;

  return (
    <div>
      <div className="mb-5 overflow-hidden rounded-2xl bg-[#172018] text-white shadow-[0_28px_80px_rgba(23,32,24,0.20)]">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Link href={`/projects/${projectId}`} className="text-sm font-semibold text-amber-300 hover:text-amber-200">
              Back to {project.name}
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Task Board</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              Move work across the pipeline, filter by priority, and zero in on the tasks that need a decision.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-2xl font-black leading-none">{activeCount}</p>
              <p className="mt-1 text-xs font-medium text-white/70">Active</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-2xl font-black leading-none">{overdueCount}</p>
              <p className="mt-1 text-xs font-medium text-white/70">Overdue</p>
            </div>
            {user?.role === "PM" && <Button onClick={() => setShowCreate(true)} className="bg-amber-400 text-stone-950 shadow-none hover:bg-amber-300">+ New Task</Button>}
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks, descriptions, or owners"
          className={inputClass}
        />
        <div className="flex rounded-xl border border-black/5 bg-white/75 p-1 shadow-sm">
          {(["ALL", "LOW", "MEDIUM", "HIGH"] as const).map((priority) => (
            <button
              key={priority}
              onClick={() => setPriorityFilter(priority)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                priorityFilter === priority
                  ? "bg-[#172018] text-white shadow-sm"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              {priority === "ALL" ? "All" : priority[0] + priority.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 hidden items-center justify-between">
        <div>
          <Link href={`/projects/${projectId}`} className={`text-sm font-medium ${BRAND.text} hover:underline`}>
            Back to {project.name}
          </Link>
          <h1 className="text-2xl font-bold text-stone-950">Task Board</h1>
        </div>
        {user?.role === "PM" && <Button onClick={() => setShowCreate(true)}>+ New Task</Button>}
      </div>

      {boardError && <div className="mb-4"><ErrorBanner message={boardError} /></div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((status) => {
          const columnTasks = visibleTasks.filter((t) => t.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, status)}
              className="rounded-xl border border-black/5 bg-white/70 p-3.5 shadow-[0_16px_42px_rgba(31,41,55,0.08)]"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-black uppercase tracking-wide text-stone-700">{statusLabels[status]}</h2>
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">
                  {columnTasks.length}
                </span>
              </div>
              <div className="min-h-[100px]">
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} draggable={canDrag(task)} onDragStart={onDragStart} />
                ))}
                {columnTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-stone-200 px-3 py-8 text-center text-xs font-medium text-stone-400">
                    No matching tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <CreateTaskModal
          projectId={projectId}
          members={project.members.map((m) => m.user)}
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

export default function TaskBoardClient({ projectId }: { projectId: number }) {
  return (
    <AuthGuard>
      <TaskBoardContent projectId={projectId} />
    </AuthGuard>
  );
}
