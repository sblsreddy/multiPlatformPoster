import { AppShell } from "@/components/app-shell";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell
      title="Campaign detail"
      description={`Campaign ${id} is ready for detail views, edit controls, and publish history.`}
    >
      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Overview</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            This placeholder page will expose campaign summary, attached posts, and upcoming publish windows. It is intentionally
            separate from the list page so future edits stay easy to scope.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Actions</p>
          <div className="mt-4 space-y-3 text-sm text-slate-100">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">Edit campaign metadata</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">Review scheduled posts</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">Open audit log</div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
