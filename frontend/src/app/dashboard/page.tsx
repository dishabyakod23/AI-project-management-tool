"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { CHART_COLORS, DonutChart, WeekBarChart } from "@/components/charts";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PriorityBadge,
  Spinner,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/api-client";
import type { DashboardStats, Notification, Project, Task } from "@/types";

const CARD_TINTS = [
  "border-sky-100 bg-sky-50/85",
  "border-amber-100 bg-amber-50/85",
  "border-emerald-100 bg-emerald-50/85",
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur">
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs font-medium text-white/70">{label}</p>
    </div>
  );
}

function InsightTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-stone-950">{value}</p>
      <p className="mt-1 text-sm text-stone-500">{hint}</p>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, projectsRes, notificationsRes] = await Promise.all([
        api.get<DashboardStats>("/api/dashboard"),
        api.get<Project[]>("/api/projects"),
        api.get<Notification[]>("/api/notifications"),
      ]);
      setStats(statsRes);
      setProjects(projectsRes);
      setNotifications(notificationsRes);

      const taskLists = await Promise.all(
        projectsRes.map((p) => api.get<Task[]>(`/api/projects/${p.id}/tasks`))
      );
      setAllTasks(taskLists.flat());
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!stats) return null;

  const today = new Date();
  const todayKey = toDateKey(today);

  const focusTasks = allTasks
    .filter((t) => t.status !== "COMPLETED")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 3);

  const workload = new Map<number, { name: string; count: number; id: number }>();
  for (const t of allTasks) {
    if (t.status === "COMPLETED" || !t.owner) continue;
    const entry = workload.get(t.owner.id) ?? { id: t.owner.id, name: t.owner.name, count: 0 };
    entry.count += 1;
    workload.set(t.owner.id, entry);
  }
  const topWorkload = [...workload.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const weekStart = startOfWeek(today);
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = toDateKey(d);
    const value = allTasks.filter((t) => t.status !== "COMPLETED" && t.due_date === key).length;
    return { label: DAY_LABELS[i], value, isToday: key === todayKey };
  });

  const backlog = Math.max(stats.total_tasks - stats.completed - stats.in_progress, 0);
  const completionRate = stats.total_tasks > 0 ? Math.round((stats.completed / stats.total_tasks) * 100) : 0;
  const activeTasks = allTasks.filter((t) => t.status !== "COMPLETED");
  const highPriority = activeTasks.filter((t) => t.priority === "HIGH").length;
  const overdueTasks = activeTasks.filter((t) => t.is_overdue).slice(0, 4);

  return (
    <div>
      <section className="mb-6 overflow-hidden rounded-2xl bg-[#172018] shadow-[0_28px_80px_rgba(23,32,24,0.22)]">
        <div className="grid gap-6 p-6 text-white sm:p-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Dashboard</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              Welcome back, {user?.name.split(" ")[0]}. Your delivery cockpit is live.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              Track urgent work, team load, delivery health, and project momentum from one sharp surface.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/projects">
                <Button variant="secondary" className="border-white/20 bg-white text-stone-950 hover:bg-amber-50">
                  View Projects
                </Button>
              </Link>
              {user?.role === "PM" && projects[0] ? (
                <Link href={`/projects/${projects[0].id}/assistant`}>
                  <Button className="bg-amber-400 text-stone-950 shadow-none hover:bg-amber-300">
                    Open AI Assistant
                  </Button>
                </Link>
              ) : (
                <Link href="/projects">
                  <Button className="bg-amber-400 text-stone-950 shadow-none hover:bg-amber-300">
                    Plan Work
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="grid content-end gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <StatPill label="Delayed" value={stats.delayed} />
            <StatPill label="Due this week" value={stats.due_this_week} />
            <StatPill label="Active high priority" value={highPriority} />
          </div>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightTile label="Completion" value={`${completionRate}%`} hint={`${stats.completed} of ${stats.total_tasks} tasks done`} />
        <InsightTile label="In Flight" value={`${stats.in_progress}`} hint="Tasks currently moving" />
        <InsightTile label="Backlog" value={`${backlog}`} hint="Unstarted or testing buffer" />
        <InsightTile label="Projects" value={`${projects.length}`} hint="Active project spaces" />
      </div>

      {overdueTasks.length > 0 && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-rose-900">Risk radar</p>
              <p className="text-sm text-rose-700">{overdueTasks.length} overdue task(s) need attention first.</p>
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto hide-scrollbar">
              {overdueTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/${t.project_id}/tasks/${t.id}`}
                  className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-rose-800 shadow-sm"
                >
                  {t.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-950">Today&apos;s Focus</h2>
            <Link href="/projects" className="text-sm font-semibold text-stone-400 hover:text-stone-700">
              See All
            </Link>
          </div>
          {focusTasks.length === 0 ? (
            <EmptyState title="Nothing urgent" description="No active tasks are due soon." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {focusTasks.map((t, i) => (
                <Link key={t.id} href={`/projects/${t.project_id}/tasks/${t.id}`}>
                  <div className={`h-full rounded-xl border p-4 transition-transform hover:-translate-y-0.5 ${CARD_TINTS[i % CARD_TINTS.length]}`}>
                    <PriorityBadge priority={t.priority} />
                    <p className="mt-3 font-bold leading-snug text-stone-950">{t.title}</p>
                    {t.owner && (
                      <div className="mt-3">
                        <Avatar user={t.owner} size="sm" />
                      </div>
                    )}
                    <p
                      className={`mt-3 text-xs font-semibold ${
                        t.is_overdue ? "text-rose-600" : "text-stone-500"
                      }`}
                    >
                      {t.is_overdue ? "Overdue - " : "Due "}
                      {t.due_date}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-950">Task Breakdown</h2>
            <span className="text-xs font-medium text-stone-400">Total {stats.total_tasks}</span>
          </div>
          <DonutChart
            total={stats.total_tasks}
            centerLabel="tasks"
            segments={[
              { label: "Completed", value: stats.completed, color: CHART_COLORS.completed },
              { label: "In Progress", value: stats.in_progress, color: CHART_COLORS.inProgress },
              { label: "Backlog", value: backlog, color: CHART_COLORS.backlog },
            ]}
          />
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-stone-950">Team Workload</h2>
            <span className="text-xs font-medium text-stone-400">active tasks</span>
          </div>
          {topWorkload.length === 0 ? (
            <EmptyState title="No active assignments" />
          ) : (
            <ul className="space-y-3">
              {topWorkload.map((w) => (
                <li key={w.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar user={w} size="md" />
                    <span className="text-sm font-semibold text-stone-700">{w.name}</span>
                  </div>
                  <span className="rounded-md bg-stone-100 px-2 py-1 text-sm font-bold text-stone-700">{w.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 font-bold text-stone-950">Tasks Due This Week</h2>
          <WeekBarChart data={weekData} />
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-stone-950">Notifications</h2>
            <span className="text-xs font-medium text-stone-400">{notifications.filter((n) => !n.is_read).length} unread</span>
          </div>
          {notifications.length === 0 ? (
            <EmptyState title="You're all caught up" />
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {notifications.slice(0, 6).map((n) => (
                <li
                  key={n.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    n.is_read ? "text-stone-400" : "bg-stone-50 font-semibold text-stone-700"
                  }`}
                >
                  {n.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-950">Your Projects</h2>
          {user?.role === "PM" && (
            <Link href="/projects">
              <Button>+ New Project</Button>
            </Link>
          )}
        </div>
        {projects.length === 0 ? (
          <EmptyState title="No projects yet" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.id} className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(31,41,55,0.13)]">
                <Link href={`/projects/${p.id}`}>
                  <p className="font-bold text-stone-950">{p.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-500">{p.description}</p>
                  <p className="mt-4 text-xs font-semibold text-stone-400">
                    {p.start_date} to {p.end_date}
                  </p>
                </Link>
                {user?.role === "PM" && (
                  <Link
                    href={`/projects/${p.id}/assistant`}
                    className="mt-4 inline-flex rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-300"
                  >
                    AI Assistant
                  </Link>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
