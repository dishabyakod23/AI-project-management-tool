"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import {
  Avatar,
  AvatarStack,
  BRAND,
  Button,
  Card,
  ErrorBanner,
  HealthBadge,
  Modal,
  Spinner,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/api-client";
import type { ProjectDetail, ProjectHealth, User } from "@/types";

function AddMemberModal({
  projectId,
  existingIds,
  onClose,
  onAdded,
}: {
  projectId: number;
  existingIds: number[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<User[]>("/api/users").then(setUsers).catch(() => {});
  }, []);

  const add = async (userId: number) => {
    setError(null);
    try {
      await api.post(`/api/projects/${projectId}/members`, { user_id: userId });
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to add member");
    }
  };

  const candidates = users.filter((u) => !existingIds.includes(u.id));

  return (
    <Modal title="Add Team Member" onClose={onClose}>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {candidates.length === 0 ? (
        <p className="text-sm text-slate-500">Everyone is already on this project.</p>
      ) : (
        <div className="space-y-1">
          {candidates.map((u) => (
            <button
              key={u.id}
              onClick={() => add(u.id)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span>
                {u.name} <span className="text-slate-400">({u.role})</span>
              </span>
              <span className={`font-medium ${BRAND.text}`}>Add</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ProjectDetailContent({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get<ProjectDetail>(`/api/projects/${projectId}`)
      .then(setProject)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load project"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [projectId]);

  const removeMember = async (userId: number) => {
    if (!confirm("Remove this member from the project?")) return;
    try {
      await api.delete(`/api/projects/${projectId}/members/${userId}`);
      load();
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : "Failed to remove member");
    }
  };

  const generateHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const result = await api.post<ProjectHealth>(`/api/ai/projects/${projectId}/health`);
      setHealth(result);
    } catch (err) {
      setHealthError(err instanceof ApiClientError ? err.message : "Failed to generate health analysis");
    } finally {
      setHealthLoading(false);
    }
  };

  if (loading) return <Spinner label="Loading project…" />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!project) return null;

  const isPm = user?.role === "PM";
  const stats = project.task_stats;
  const today = new Date();
  const endDate = new Date(project.end_date);
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-2xl bg-[#172018] text-white shadow-[0_28px_80px_rgba(23,32,24,0.20)]">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Project</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{project.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">{project.description}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/50">
              {project.start_date} to {project.end_date}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AvatarStack users={project.members.map((m) => m.user)} />
            <Link href={`/projects/${projectId}/board`}>
              <Button variant="secondary" className="border-white/20 bg-white text-stone-950 hover:bg-amber-50">
                Task Board
              </Button>
            </Link>
            {isPm && (
              <Link href={`/projects/${projectId}/assistant`}>
                <Button className="bg-amber-400 text-stone-950 shadow-none hover:bg-amber-300">AI Assistant</Button>
              </Link>
            )}
          </div>
        </div>
        <div className="grid border-t border-white/10 bg-white/5 sm:grid-cols-3">
          <div className="p-5">
            <p className="text-3xl font-black">{stats.completion_percentage}%</p>
            <p className="text-xs font-medium text-white/60">Complete</p>
          </div>
          <div className="border-t border-white/10 p-5 sm:border-l sm:border-t-0">
            <p className="text-3xl font-black">{Math.max(daysRemaining, 0)}</p>
            <p className="text-xs font-medium text-white/60">Days remaining</p>
          </div>
          <div className="border-t border-white/10 p-5 sm:border-l sm:border-t-0">
            <p className="text-3xl font-black">{stats.overdue}</p>
            <p className="text-xs font-medium text-white/60">Overdue tasks</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 font-bold text-stone-950">Progress</h2>
            <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#172018] via-[#1baf7a] to-[#f59e0b] transition-all"
                style={{ width: `${stats.completion_percentage}%` }}
              />
            </div>
            <p className="text-sm font-medium text-stone-500">{stats.completion_percentage}% complete</p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ["Total", stats.total],
                ["To Do", stats.todo],
                ["In Progress", stats.in_progress],
                ["Testing", stats.testing],
                ["Completed", stats.completed],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-black/5 bg-stone-50 p-3 text-center">
                  <p className="text-xl font-black text-stone-900">{value}</p>
                  <p className="text-xs font-medium text-stone-500">{label}</p>
                </div>
              ))}
            </div>
            {stats.overdue > 0 && (
              <p className="mt-3 text-sm font-medium text-rose-600">{stats.overdue} task(s) overdue</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-bold text-stone-950">Project Health (AI)</h2>
              <Button onClick={generateHealth} disabled={healthLoading} variant="secondary">
                {healthLoading ? "Analyzing…" : health ? "Refresh Analysis" : "Generate Health Analysis"}
              </Button>
            </div>

            {healthError && <ErrorBanner message={healthError} onRetry={generateHealth} />}
            {!health && !healthError && !healthLoading && (
              <p className="text-sm text-slate-500">
                Run an AI analysis grounded in this project&apos;s real tasks and dates.
              </p>
            )}
            {healthLoading && <Spinner label="Analyzing project data…" />}

            {health && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <HealthBadge health={health.health} />
                  <p className="text-sm text-stone-600">{health.summary}</p>
                </div>

                {health.risks.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-stone-700">Risks</h3>
                    <ul className="space-y-2">
                      {health.risks.map((r, i) => (
                        <li key={i} className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-900">{r.title}</span>
                            <span className="text-xs font-medium text-rose-600">{r.severity}</span>
                          </div>
                          <p className="mt-1 text-stone-500">{r.evidence}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {health.recommended_actions.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-stone-700">Recommended Actions</h3>
                    <ul className="space-y-2">
                      {health.recommended_actions.map((a, i) => (
                        <li key={i} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm">
                          <p className="font-semibold text-emerald-950">{a.action}</p>
                          <p className="text-emerald-700">{a.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <details className="text-xs text-stone-400">
                  <summary className="cursor-pointer">Objective facts used</summary>
                  <pre className="mt-1 overflow-x-auto">{JSON.stringify(health.objective_facts, null, 2)}</pre>
                </details>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-stone-950">Team ({project.members.length})</h2>
              {isPm && (
                <button onClick={() => setShowAddMember(true)} className={`text-sm font-medium ${BRAND.text} hover:underline`}>
                  + Add
                </button>
              )}
            </div>
            <ul className="space-y-3">
              {project.members.map((m) => (
                <li key={m.user.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <Avatar user={m.user} size="sm" />
                    <span className="text-stone-700">
                      {m.user.name} <span className="text-stone-400">({m.user.role})</span>
                    </span>
                  </div>
                  {isPm && (
                    <button
                      onClick={() => removeMember(m.user.id)}
                      className="text-xs text-slate-400 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal
          projectId={projectId}
          existingIds={project.members.map((m) => m.user.id)}
          onClose={() => setShowAddMember(false)}
          onAdded={load}
        />
      )}
    </div>
  );
}

export default function ProjectDetailClient({ projectId }: { projectId: number }) {
  return (
    <AuthGuard>
      <ProjectDetailContent projectId={projectId} />
    </AuthGuard>
  );
}
