"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api-client";
import { BRAND, Button, Field, inputClass } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("alice@demo.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="surface-grid min-h-screen px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-2xl bg-[#172018] p-7 text-white shadow-[0_30px_90px_rgba(23,32,24,0.24)] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">AI PM Tool</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
            Plan, unblock, and ship with the whole project in view.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
            A focused workspace for project managers who need tasks, risk, workload, AI planning, and team signals in one place.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["AI", "Task generation"],
              ["Live", "Delivery dashboard"],
              ["Fast", "Board updates"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/10 p-4">
                <p className="text-2xl font-black">{value}</p>
                <p className="mt-1 text-xs font-medium text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="w-full rounded-2xl border border-black/5 bg-white/90 p-7 shadow-[0_24px_70px_rgba(31,41,55,0.14)] backdrop-blur sm:p-8">
          <p className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] ${BRAND.accent}`}>Command center</p>
          <h2 className="mb-1 text-2xl font-black tracking-tight text-stone-950">Welcome back</h2>
          <p className="mb-6 text-sm text-stone-500">Sign in to continue</p>

          <form onSubmit={onSubmit}>
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-black/5 bg-stone-50 p-4 text-xs leading-5 text-stone-500">
            <p className="mb-1 font-bold text-stone-700">Demo accounts (password: password123)</p>
            <p>PM: alice@demo.com, bob@demo.com</p>
            <p>Member: carol@demo.com, david@demo.com, priya@demo.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
