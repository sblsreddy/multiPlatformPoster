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

export default async function DashboardPage() {
  const data = await getDashboardData();

  const metricCards = [
    {
      label: "Scheduled posts",
      value: data.metrics.totalPosts,
      note: `${data.metrics.scheduledPosts} scheduled • ${data.metrics.publishingPosts} publishing`,
    },
    {
      label: "Drafts",
      value: data.metrics.draftPosts,
      note: "Ready for final review",
    },
    {
      label: "Publish failures",
      value: data.metrics.failedPosts,
      note: "Tracked from recent attempts and post state",
    },
    {
      label: "Platform coverage",
      value: data.metrics.uniquePlatforms,
      note: "Active platforms across current posts",
    },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Live overview of campaign health, scheduled posts, and publish issues."
    >
      {!data.configured ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Live data is not available yet. Once Supabase is configured, the dashboard will show real post, campaign, and audit data.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-300">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
            <p className="mt-2 text-sm text-slate-300">{metric.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Live activity</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Recent post activity</h3>
            </div>
            <Link
              href="/scheduled-posts/new"
              className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Create post
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {data.posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-4 py-5 text-sm text-slate-300">
                No scheduled posts are available yet for this organization.
              </div>
            ) : (
              data.posts.slice(0, 5).map((post) => (
                <div key={post.id} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{post.status}</p>
                      <h4 className="mt-2 text-base font-semibold text-white">{post.title}</h4>
                    </div>
                    <p className="text-sm text-slate-300">{formatDisplayDate(post.scheduledAt)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-200">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {Array.isArray(post.selectedPlatforms) && post.selectedPlatforms.length > 0
                        ? post.selectedPlatforms.join(", ")
                        : "No platforms"}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">{post.publishAttempts} attempts</span>
                    {post.lastError ? <span className="rounded-full border border-rose-400/60 px-3 py-1 text-rose-100">{post.lastError}</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Publish history</p>
            <div className="mt-4 space-y-3">
              {data.recentAttempts.length === 0 ? (
                <p className="text-sm text-slate-300">No publish attempts have been recorded yet.</p>
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
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Quick actions</p>
            <div className="mt-4 space-y-3">
              <Link href="/campaigns" className="block rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 transition hover:border-cyan-300">
                Review campaigns
              </Link>
              <Link href="/scheduled-posts" className="block rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 transition hover:border-cyan-300">
                Open scheduled posts
              </Link>
              <Link href="/audit-logs" className="block rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 transition hover:border-cyan-300">
                Review audit logs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
