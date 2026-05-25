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

export default async function AuditLogsPage() {
  const data = await getDashboardData();

  return (
    <AppShell
      title="Audit logs"
      description="Review recent actions, webhook activity, and platform events from the current organization."
    >
      {!data.configured ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Audit logs will appear once Supabase is configured.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="grid grid-cols-[1.1fr_1.2fr_1fr] border-b border-white/10 px-4 py-3 text-sm font-semibold text-slate-100">
          <span>Action</span>
          <span>Resource</span>
          <span>Time</span>
        </div>
        {data.auditLogs.length === 0 ? (
          <div className="px-4 py-5 text-sm text-slate-300">No audit events have been recorded yet.</div>
        ) : (
          data.auditLogs.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-[1.1fr_1.2fr_1fr] gap-2 border-b border-white/10 px-4 py-4 text-sm text-slate-200 last:border-b-0"
            >
              <div>
                <p className="font-semibold text-white">{log.action}</p>
                <p className="mt-1 text-xs text-slate-400">{JSON.stringify(log.metadata)}</p>
              </div>
              <span>{log.resourceType}</span>
              <span>{formatDisplayDate(log.createdAt)}</span>
            </div>
          ))
        )}
      </section>
    </AppShell>
  );
}
