import type { Metadata } from "next";
import { daysLeft, isoDate, officialUrl, opportunities, postsForDate, upcomingDates } from "@/lib/opportunities";

export const metadata: Metadata = {
  title: "FundInTech | Today's opportunities",
  description: "Official links for every opportunity posted on @fundntech.",
};
export const dynamic = "force-dynamic";

const WHATSAPP = "https://whatsapp.com/channel/0029Vb8qkT665yD5DDnGhO2l";

export default function Today() {
  const now = new Date();
  const today = isoDate(now);
  // Everything posted so far (from the schedule) and still open, newest first.
  const seen = new Set<string>();
  const recent = upcomingDates(new Date(now.getTime() - 13 * 86_400_000), 14)
    .filter((d) => isoDate(d) <= today)
    .reverse()
    .flatMap((d) => postsForDate(d))
    .filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
    .filter((o) => daysLeft(o, now) >= 0 && o.deadlineISO >= today);
  const list = recent.length ? recent : opportunities.filter((o) => o.verified && o.deadlineISO >= today);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-md space-y-5">
        <header className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-cyan-400 bg-slate-900 text-2xl font-black text-cyan-400">
            FT
          </div>
          <h1 className="mt-3 text-2xl font-black">
            FUND<span className="text-yellow-400">IN</span>TECH
          </h1>
          <p className="text-sm text-slate-400">Official links to every opportunity we post. Apply only on official sites.</p>
        </header>

        <a href={WHATSAPP} className="block rounded-2xl bg-emerald-500 px-4 py-3 text-center font-bold text-slate-950">
          Join our WhatsApp channel for daily alerts
        </a>

        <ul className="space-y-3">
          {list.map((o) => {
            const d = daysLeft(o, now);
            return (
              <li key={o.id}>
                <a
                  href={officialUrl(o)}
                  className="block rounded-2xl border border-slate-700 bg-slate-900 p-4 transition hover:border-yellow-400"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="rounded bg-yellow-400 px-2 py-0.5 font-bold text-slate-950">{o.label}</span>
                    {!o.deadlineVaries && d <= 120 && (
                      <span className="font-bold text-red-400">{d === 0 ? "Last day!" : `${d} days left`}</span>
                    )}
                  </div>
                  <div className="mt-2 font-bold">{o.title}</div>
                  <div className="text-sm text-slate-400">
                    {o.highlight} · {o.highlightLabel.toLowerCase()}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Deadline: {o.deadline}</div>
                  <div className="mt-2 text-sm font-semibold text-cyan-300">Open official site →</div>
                </a>
              </li>
            );
          })}
        </ul>
        <p className="text-center text-xs text-slate-500">Follow @fundntech on TikTok for 2 new opportunities every day.</p>
      </div>
    </main>
  );
}
