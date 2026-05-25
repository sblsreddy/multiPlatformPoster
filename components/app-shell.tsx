"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/scheduled-posts", label: "Scheduled posts" },
  { href: "/settings/social-accounts", label: "Social accounts" },
  { href: "/settings/webhooks", label: "Webhooks" },
  { href: "/audit-logs", label: "Audit logs" },
];

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const supabase = getSupabaseBrowserClient();

  const handleSignOut = async () => {
    if (!supabase) {
      router.push("/login");
      return;
    }

    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">MultiPlatformPoster</p>
              <h1 className="text-xl font-semibold sm:text-2xl">Admin control center</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Supabase Auth
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 transition ${
                    isActive
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-cyan-950/20">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{title}</p>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">{description}</h2>
        </section>

        {children}
      </main>
    </div>
  );
}
