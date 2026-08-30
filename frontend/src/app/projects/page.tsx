"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { BRAND, Button, Card, EmptyState, ErrorBanner, Field, Modal, Spinner, inputClass } from "@/components/ui";
import { api, ApiClientError } from "@/lib/api-client";
import type { Project, ProjectDetail, User } from "@/types";

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<User[]>("/api/users").then(setUsers).catch(() => {});
  }, []);

  const toggleMember = (id: number) =>
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post<ProjectDetail>("/api/projects", {
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        member_ids: memberIds,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Create Project" onClose={onClose} wide>
      <form onSubmit={submit}>
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            rows={3}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date">
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="End Date">
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Team Members">
          <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={memberIds.includes(u.id)}
                  onChange={() => toggleMember(u.id)}
                />
                {u.name} <span className="text-slate-400">({u.role})</span>
              </label>
            ))}
          </div>
        </Field>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectsContent() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "active" | "ending">("all");

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get<Project[]>("/api/projects")
      .then(setProjects)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load projects"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const soonKey = thirtyDaysFromNow.toISOString().slice(0, 10);

  const filteredProjects = projects.filter((p) => {
    const matchesQuery = `${p.name} ${p.description ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const isActive = p.start_date <= today && p.end_date >= today;
    const isEndingSoon = p.end_date >= today && p.end_date <= soonKey;
    if (view === "active") return matchesQuery && isActive;
    if (view === "ending") return matchesQuery && isEndingSoon;
    return matchesQuery;
  });

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-2xl border border-black/5 bg-white/85 shadow-[0_22px_60px_rgba(31,41,55,0.09)]">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.18em] ${BRAND.accent}`}>Workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-950">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
              Search initiatives, jump into active work, and spot timelines that need attention.
            </p>
          </div>
          {user?.role === "PM" && <Button onClick={() => setShowCreate(true)}>+ New Project</Button>}
        </div>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects by name or description"
          className={inputClass}
        />
        <div className="flex rounded-xl border border-black/5 bg-white/75 p-1 shadow-sm">
          {[
            ["all", "All"],
            ["active", "Active"],
            ["ending", "Ending Soon"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key as "all" | "active" | "ending")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                view === key ? "bg-[#172018] text-white shadow-sm" : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {!loading && !error && projects.length === 0 && (
        <EmptyState
          title="No projects yet"
          description={user?.role === "PM" ? "Create your first project to get started." : undefined}
        />
      )}

      {!loading && !error && projects.length > 0 && filteredProjects.length === 0 && (
        <EmptyState title="No matching projects" description="Adjust the search or switch project views." />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((p) => {
          const isActive = p.start_date <= today && p.end_date >= today;
          const isEndingSoon = p.end_date >= today && p.end_date <= soonKey;
          return (
            <Card key={p.id} className="group h-full overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_58px_rgba(31,41,55,0.14)]">
              <div className="h-1.5 bg-gradient-to-r from-[#172018] via-[#1baf7a] to-[#f59e0b]" />
              <div className="p-5">
                <Link href={`/projects/${p.id}`}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">
                      {isActive ? "Active" : "Scheduled"}
                    </span>
                    {isEndingSoon && (
                      <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                        Ending soon
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-black text-stone-950">{p.name}</p>
                  <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-stone-500">{p.description}</p>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-stone-400">
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
              </div>
            </Card>
          );
        })}
      </div>

      {!loading && !error && filteredProjects.length > 0 && (
        <p className="mt-4 text-sm font-medium text-stone-500">
          Showing {filteredProjects.length} of {projects.length} project(s)
        </p>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <ProjectsContent />
    </AuthGuard>
  );
}
