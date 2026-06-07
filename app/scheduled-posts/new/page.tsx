import { AppShell } from "@/components/app-shell";
import { ScheduledPostForm } from "@/components/scheduled-post-form";

export default function NewScheduledPostPage() {
  return (
    <AppShell
      title="Create scheduled post"
      description="Capture campaign copy, platform targets, timezone, and scheduling details in a responsive form."
    >
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h3 className="text-lg font-semibold text-white">Post details</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This form validates the post, uploads media to Supabase Storage, stores the media asset ID with the scheduled post,
              and can publish directly to Facebook for end-to-end testing.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-cyan-300/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">
            Facebook image posts use the attached Supabase media asset: the server downloads the private storage object and sends
            it to Meta Graph API as a Page photo post.
          </div>
        </div>

        <div className="mt-6">
          <ScheduledPostForm />
        </div>
      </section>
    </AppShell>
  );
}
