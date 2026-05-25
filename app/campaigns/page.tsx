import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/supabase/dashboard-data";

export default async function CampaignsPage() {
  const data = await getDashboardData();

  return (
    <AppShell
      title="Campaigns"
      description="Review live campaign coverage and how many posts are assigned to each campaign."
    >
      {!data.configured ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Campaign data will populate once Supabase is configured.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-5 py-6 text-sm text-slate-300 md:col-span-2 xl:col-span-3">
            No campaigns are available for this organization yet.
          </div>
        ) : (
          data.campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{campaign.status}</p>
              <h3 className="mt-3 text-lg font-semibold text-white">{campaign.name}</h3>
              <p className="mt-2 text-sm text-slate-300">
                {campaign.objective || "No objective defined"}
              </p>
              <p className="mt-2 text-sm text-slate-300">Posts assigned: {campaign.nextPostCount}</p>
              <Link
                href="/campaigns/new"
                className="mt-4 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200"
              >
                View campaign
              </Link>
            </div>
          ))
        )}
      </section>
    </AppShell>
  );
}
