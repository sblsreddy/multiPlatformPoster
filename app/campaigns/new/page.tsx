import { AppShell } from "@/components/app-shell";

export default function NewCampaignPage() {
  return (
    <AppShell
      title="Create campaign"
      description="Use this page to define campaign goals, target areas, and publish windows."
    >
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h3 className="text-lg font-semibold text-white">Campaign blueprint</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              The create/edit flow will be connected to Supabase campaigns and audit logs in the next implementation pass.
              The skeleton is intentionally simple and responsive so it can expand without reworking the navigation.
            </p>
            <div className="mt-5 rounded-2xl border border-dashed border-cyan-300/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">
              Suggested fields: campaign name, objective, timezone, start/end date, target region, and default platform mix.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Phase 1 notes</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>• Campaigns remain organization-scoped.</li>
              <li>• Draft state is available before scheduling.</li>
              <li>• Media and audit hooks will be added after schema validation.</li>
            </ul>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
