"use client";

import type { TaskPriority, TaskStatus, HealthRating, User } from "@/types";

export const BRAND = {
  pill: "bg-[#172018] hover:bg-[#263329]",
  text: "text-[#172018]",
  accent: "text-[#d97706]",
  ring: "focus:ring-[#172018]",
};

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-stone-500 justify-center">
      <span className="h-4 w-4 rounded-full border-2 border-stone-300 border-t-[#172018] animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-md bg-rose-100 px-3 py-1 font-medium hover:bg-rose-200"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300/90 bg-white/70 px-6 py-10 text-center shadow-sm">
      <p className="font-medium text-stone-800">{title}</p>
      {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-black/5 bg-white/88 shadow-[0_18px_50px_rgba(31,41,55,0.08)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const variants: Record<string, string> = {
    primary: `${BRAND.pill} text-white shadow-[0_10px_24px_rgba(23,32,24,0.18)] disabled:bg-stone-300 disabled:shadow-none`,
    secondary: "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 disabled:opacity-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
    ghost: "text-stone-600 hover:bg-stone-100 disabled:opacity-50",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const priorityStyles: Record<TaskPriority, string> = {
  LOW: "bg-stone-100 text-stone-600 ring-stone-200",
  MEDIUM: "bg-amber-100 text-amber-800 ring-amber-200",
  HIGH: "bg-rose-100 text-rose-800 ring-rose-200",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ${priorityStyles[priority]}`}>
      {priority}
    </span>
  );
}

const statusStyles: Record<TaskStatus, string> = {
  TODO: "bg-stone-100 text-stone-700",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  TESTING: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

export const statusLabels: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  TESTING: "Testing",
  COMPLETED: "Completed",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

const healthStyles: Record<HealthRating, { bg: string; text: string; dot: string }> = {
  GREEN: { bg: "bg-emerald-50 ring-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  AMBER: { bg: "bg-amber-50 ring-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  RED: { bg: "bg-rose-50 ring-rose-100", text: "text-rose-800", dot: "bg-rose-500" },
};

export function HealthBadge({ health }: { health: HealthRating }) {
  const s = healthStyles[health];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-semibold ring-1 ${s.bg} ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {health}
    </span>
  );
}

// Deterministic pastel avatar color per user, so the same person always gets
// the same color across the app without storing anything.
const AVATAR_TINTS = [
  "bg-sky-100 text-sky-800 ring-sky-200",
  "bg-indigo-100 text-indigo-800 ring-indigo-200",
  "bg-orange-100 text-orange-800 ring-orange-200",
  "bg-emerald-100 text-emerald-800 ring-emerald-200",
  "bg-rose-100 text-rose-800 ring-rose-200",
  "bg-amber-100 text-amber-800 ring-amber-200",
];

function tintFor(seed: number): string {
  return AVATAR_TINTS[Math.abs(seed) % AVATAR_TINTS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const AVATAR_SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function Avatar({
  user,
  size = "md",
  ringed = false,
}: {
  user: Pick<User, "id" | "name">;
  size?: keyof typeof AVATAR_SIZES;
  ringed?: boolean;
}) {
  return (
    <span
      title={user.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ${tintFor(user.id)} ${AVATAR_SIZES[size]} ${ringed ? "ring-2 ring-white" : ""}`}
    >
      {initials(user.name)}
    </span>
  );
}

export function AvatarStack({ users, max = 4 }: { users: Pick<User, "id" | "name">[]; max?: number }) {
  const shown = users.slice(0, max);
  const overflow = users.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((u) => (
        <Avatar key={u.id} user={u} size="sm" ringed />
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-600 ring-2 ring-white">
          +{overflow}
        </span>
      )}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm">
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto rounded-xl border border-white/70 bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700" aria-label="Close">
            x
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#172018] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#172018] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500";
