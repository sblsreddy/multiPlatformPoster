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
              This form uses React Hook Form and Zod for validation. The submit handler is currently in mock mode so the UI can be
              exercised while real Supabase and n8n wiring is completed.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-cyan-300/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">
            Media upload, storage integration, and publish attempt tracking will be added in the next phase.
          </div>
        </div>

        <div className="mt-6">
          <ScheduledPostForm />
        </div>
      </section>
    </AppShell>
  );
}
