"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setMessage({
          type: "error",
          text: "Supabase environment variables are not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to continue.",
        });
        return;
      }

      const sessionResult = await supabase.auth.getSession();

      if (sessionResult.data.session) {
        router.replace("/dashboard");
      }
    };

    checkSession();
  }, [router, supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!supabase) {
      setMessage({
        type: "error",
        text: "Supabase environment variables are not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to continue.",
      });
      setLoading(false);
      return;
    }

    try {
      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
              },
            });

      if (result.error) {
        setMessage({ type: "error", text: result.error.message });
        return;
      }

      if (mode === "sign-up" && !result.data.session) {
        setMessage({
          type: "success",
          text: "Check your inbox to confirm your email address, then sign in.",
        });
        return;
      }

      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Supabase Auth</p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Sign in to manage multi-platform ad scheduling.</h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
              This pass wires real Supabase Auth, storage-upload support, and the scheduled-post webhook path.
              The dashboard now uses secure sessions and server-side route protection.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/settings/webhooks"
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200"
              >
                Review webhook setup
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30">
            <div className="flex gap-2 rounded-full bg-slate-950/80 p-1">
              <button
                type="button"
                onClick={() => setMode("sign-in")}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === "sign-in" ? "bg-cyan-400 text-slate-950" : "text-slate-200"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("sign-up")}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === "sign-up" ? "bg-cyan-400 text-slate-950" : "text-slate-200"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-100">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
                  placeholder="you@company.com"
                />
              </label>

              <label className="block text-sm font-medium text-slate-100">
                Password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
                  placeholder="At least 8 characters"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            </form>

            {message && (
              <div
                className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                  message.type === "error"
                    ? "border border-rose-300/60 bg-rose-400/10 text-rose-100"
                    : "border border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-dashed border-cyan-300/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">
              {mode === "sign-in"
                ? "Use your Supabase email and password to access the admin dashboard."
                : "Create an account and the first authenticated session will bootstrap your organization automatically."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
