"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, FileText, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApiClientError, api } from "@/lib/api-client";
import type { SessionUser } from "@/types";

const DEMO_PASSWORD = "Demo@1234";

const DEMO_ACCOUNTS = [
  { name: "Alice", email: "alice@demo.test", note: "Owns the sample documents" },
  { name: "Bob", email: "bob@demo.test", note: "Viewer on a shared doc" },
  { name: "Carol", email: "carol@demo.test", note: "Editor on a shared doc" },
  { name: "Dave", email: "dave@demo.test", note: "No access yet — test 404s" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("alice@demo.test");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/")) setNextPath(next);
  }, []);

  const signIn = async (credentials: { email: string; password: string }, source: string) => {
    setPending(source);
    setError(null);
    try {
      await api.post<{ user: SessionUser }>("/api/auth/login", credentials);
      router.replace(nextPath);
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof ApiClientError
          ? loginError.message
          : "Could not sign in. Please try again."
      );
      setPending(null);
    }
  };

  return (
    <main className="min-h-screen bg-surface lg:grid lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink px-10 py-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-sm font-bold">
            D
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Docket</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Write it down.
            <br />
            Share it precisely.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/70">
            A deliberately small document workspace: rich text, autosave, markdown import and
            per-document roles that the server actually enforces.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-brand-100" aria-hidden />
              Rich text with headings, lists and autosave
            </li>
            <li className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-brand-100" aria-hidden />
              Import .md and .txt into a new document
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-brand-100" aria-hidden />
              Viewer / Editor roles enforced server-side
            </li>
          </ul>
        </div>

        <p className="text-xs text-white/40">
          Demo build · seeded accounts only · no sign-up.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              D
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Docket</span>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-ink">Sign in</h2>
            <p className="mt-1 text-sm text-mute">
              Use a demo account below, or type the shared demo password.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void signIn({ email, password }, "form");
              }}
            >
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-ink">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-mute/70"
                  placeholder="alice@demo.test"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-ink">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="h-10 w-full rounded-lg border border-line bg-white px-3 pr-10 text-sm text-ink"
                    placeholder="Demo@1234"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-mute hover:bg-surface hover:text-ink"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full" loading={pending === "form"}>
                <LockKeyhole className="h-4 w-4" aria-hidden />
                Sign in
              </Button>
            </form>
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mute">Demo accounts</p>
            <p className="mt-1 text-xs text-mute">
              One click fills the form and signs you in. Shared password:{" "}
              <code className="rounded bg-surface px-1 py-0.5 font-mono text-[11px]">
                {DEMO_PASSWORD}
              </code>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() =>
                    void signIn({ email: account.email, password: DEMO_PASSWORD }, account.email)
                  }
                  disabled={pending !== null}
                  className="group flex flex-col items-start rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-brand-100 hover:bg-brand-50 disabled:opacity-60"
                >
                  <span className="flex w-full items-center justify-between text-[13px] font-medium text-ink">
                    {account.name}
                    {pending === account.email ? (
                      <span className="text-[11px] text-brand-600">signing in…</span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 truncate text-[11px] text-mute">{account.note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
