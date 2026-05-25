import { AppShell } from "@/components/app-shell";

export default function WebhooksPage() {
  return (
    <AppShell
      title="Webhooks"
      description="Document n8n webhook endpoints, secrets, and validation requirements in one place."
    >
      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Current configuration</p>
          <div className="mt-4 space-y-3 text-sm text-slate-100">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">Webhook URL: <span className="text-cyan-200">N8N_WEBHOOK_URL</span></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">Signature secret: <span className="text-cyan-200">N8N_WEBHOOK_SECRET</span></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">Rate limit: <span className="text-cyan-200">WEBHOOK_RATE_LIMIT_PER_MINUTE</span></div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Security checklist</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-200">
            <li>• Validate signatures before processing webhook payloads.</li>
            <li>• Reject unauthenticated events and apply rate limiting.</li>
            <li>• Log every event in `webhook_events` and tie it to audit logs.</li>
            <li>• Keep platform credentials in n8n, not the Next.js frontend.</li>
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
