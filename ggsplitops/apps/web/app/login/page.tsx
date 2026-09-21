"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signIn, signUp } from "../../lib/auth-client";
import { ThemeToggle } from "../../components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result =
      mode === "signin"
        ? await signIn.email({ email, password })
        : await signUp.email({ email, password, name });

    setBusy(false);

    if (result.error) {
      // Say what went wrong and what to do about it, in the app's voice.
      setError(result.error.message ?? "That didn't work. Check your details and try again.");
      return;
    }
    router.push("/groups");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <div className="flex items-center justify-between">
        <Link href="/" className="eyebrow hover:text-[--color-muted] transition-colors">
          ← ggsplitops
        </Link>
        <ThemeToggle />
      </div>

      <h1 className="mt-8 text-2xl font-medium tracking-tight">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="text-[--color-muted] mt-2 text-sm">
        {mode === "signin"
          ? "Sign in to see what you're owed."
          : "Start tracking shared expenses in about a minute."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {mode === "signup" && (
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </Field>
        )}

        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>

        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </Field>

        {error && (
          <p
            role="alert"
            className="border-[--color-debit-dim] bg-[--color-debit-dim] text-[--color-debit] rounded-[--radius] border px-3 py-2 text-sm"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="bg-[--color-brass] w-full rounded-[--radius] py-2.5 text-sm font-medium text-[#0b0e0d] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="text-[--color-muted] hover:text-[--color-text] mt-6 text-sm transition-colors"
      >
        {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
      </button>
    </main>
  );
}

const inputClass =
  "w-full rounded-[--radius] border border-[--color-line] bg-[--color-surface] px-3 py-2 text-sm outline-none transition-colors focus:border-[--color-line-bright]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
