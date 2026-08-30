"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api-client";
import { Avatar, BRAND } from "@/components/ui";
import type { Notification } from "@/types";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const projectId = pathname.match(/^\/projects\/(\d+)/)?.[1];
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = () => api.get<Notification[]>("/api/notifications").then(setNotifications).catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const unread = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id: number) => {
    await api.post(`/api/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  return (
    <div className="sticky top-0 z-30 border-b border-black/5 bg-[#f6f7f4]/85 backdrop-blur-xl">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="group flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#172018] text-sm font-black text-white shadow-[0_12px_28px_rgba(23,32,24,0.22)]">
              AP
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-black leading-tight tracking-tight text-stone-950">AI PM</span>
              <span className="block text-[11px] font-medium leading-tight text-stone-500">Command center</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-xl border border-black/5 bg-white/70 p-1 shadow-sm sm:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
                    active ? `${BRAND.pill} text-white shadow-sm` : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {projectId && user.role === "PM" && (
              <Link
                href={`/projects/${projectId}/assistant`}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
                  pathname.includes("/assistant")
                    ? `${BRAND.pill} text-white shadow-sm`
                    : "text-amber-800 hover:bg-amber-50"
                }`}
              >
                AI Assistant
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="relative grid h-9 w-9 place-items-center rounded-lg border border-black/5 bg-white/70 text-stone-600 shadow-sm hover:bg-white"
              aria-label="Notifications"
            >
              <span className="text-base leading-none">!</span>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {open && (
              <div className="absolute right-0 z-40 mt-3 w-80 overflow-hidden rounded-xl border border-black/5 bg-white shadow-2xl">
                <div className="border-b border-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">
                  Notifications
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-stone-400">No notifications</p>
                  )}
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`block w-full border-b border-stone-50 px-4 py-2.5 text-left text-sm hover:bg-stone-50 ${
                        n.is_read ? "text-stone-400" : "font-medium text-stone-900"
                      }`}
                    >
                      {n.message}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="hidden text-right text-sm sm:block">
            <div className="font-semibold text-stone-900">{user.name}</div>
            <div className="text-xs text-stone-500">{user.role === "PM" ? "Project Manager" : "Team Member"}</div>
          </div>
          <Avatar user={user} size="md" />
          <button
            onClick={logout}
            className="rounded-lg border border-black/5 bg-white/70 px-3 py-1.5 text-sm font-semibold text-stone-600 shadow-sm hover:bg-white hover:text-stone-900"
          >
            Log out
          </button>
        </div>
      </header>
    </div>
  );
}
