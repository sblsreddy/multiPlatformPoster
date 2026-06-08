import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/supabase/dashboard-data";

function formatDisplayDate(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ScheduledPostsPage() {
  const data = await getDashboardData();

  return (
    <AppShell
      title="Scheduled posts"
      description="Review live scheduled posts, current publish state, and recent error history."
    >
      {!data.configured ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Live schedule data will appear once Supabase is configured.
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {data.posts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-8 text-sm text-slate-300">
              No scheduled posts are available for this organization yet.
            </div>
          ) : (
            data.posts.map((post) => (
              <div key={post.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{post.status}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                      {post.createdAt ? (
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          created {post.createdAt}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-sm text-slate-300">
                    <p>{formatDisplayDate(post.scheduledAt)}</p>
                    <p>{post.timezone ?? "No timezone set"}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-100">
                  <span className="rounded-full border border-white/10 px-3 py-1">{post.selectedPlatforms.join(", ") || "No platforms"}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">{post.publishAttempts} attempts</span>
                  {post.location ? <span className="rounded-full border border-white/10 px-3 py-1">{post.location}</span> : null}
                </div>

                {post.lastError ? (
                  <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    <p className="font-semibold">Latest error</p>
                    <p className="mt-1">{post.lastError}</p>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">History & errors</p>
            <div className="mt-4 space-y-3">
              {data.recentAttempts.length === 0 ? (
                <p className="text-sm text-slate-300">No recent publish attempts are available.</p>
              ) : (
                data.recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{attempt.scheduledPostTitle}</p>
                        <p className="text-sm text-slate-300">{attempt.status}</p>
                      </div>
                      <p className="text-xs text-slate-400">{formatDisplayDate(attempt.startedAt)}</p>
                    </div>
                    {attempt.errorMessage ? (
                      <p className="mt-2 text-sm text-rose-100">{attempt.errorMessage}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Create new post</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Use the dedicated post form for validation, media uploads, and publish orchestration.
            </p>
            <Link
              href="/scheduled-posts/new"
              className="mt-4 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Open form
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
