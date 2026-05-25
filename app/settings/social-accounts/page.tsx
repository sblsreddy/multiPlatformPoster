import { AppShell } from "@/components/app-shell";

const accounts = [
  { provider: "Facebook", status: "Connected", note: "Business page ready for publishing" },
  { provider: "Instagram", status: "Pending", note: "Add account to enable media publishing" },
  { provider: "LinkedIn", status: "Connected", note: "Organization page verified" },
  { provider: "TikTok", status: "Pending", note: "Add account after token review" },
  { provider: "X", status: "Connected", note: "Posting permissions confirmed" },
];

export default function SocialAccountsPage() {
  return (
    <AppShell
      title="Social accounts"
      description="Keep account statuses and provider coverage organized for future publish flows."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => (
          <div key={account.provider} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{account.provider}</p>
            <p className="mt-3 text-lg font-semibold text-white">{account.status}</p>
            <p className="mt-2 text-sm text-slate-300">{account.note}</p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
