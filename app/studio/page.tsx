import type { Metadata } from "next";
import CopyButton from "./CopyButton";
import {
  captionFor,
  isoDate,
  opportunities,
  postsForDate,
  SLIDES_PER_POST,
  upcomingDates,
  type Opportunity,
} from "@/lib/opportunities";

export const metadata: Metadata = { title: "FundInTech Post Studio" };
export const dynamic = "force-dynamic";

const SLOT_LABEL = ["EARN", "STUDY / FELLOWSHIP"];

function PostCard({ o, label }: { o: Opportunity; label?: string }) {
  const caption = captionFor(o);
  const slides = Array.from({ length: SLIDES_PER_POST }, (_, i) => i + 1);
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {label && <span className="rounded bg-yellow-400 px-2 py-0.5 text-xs font-bold text-black">{label}</span>}
        <span className="rounded bg-teal-500/20 px-2 py-0.5 text-xs font-semibold text-teal-300">{o.label}</span>
        <span className="text-xs text-slate-400">Deadline: {o.deadline}</span>
      </div>
      <h3 className="text-lg font-bold text-white">{o.title}</h3>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {slides.map((n) => (
          <a key={n} href={`/api/slide/${o.id}/${n}.jpg`} target="_blank" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/slide/${o.id}/${n}.jpg`}
              alt={`${o.title} slide ${n}`}
              width={180}
              height={240}
              loading="lazy"
              className="h-[240px] w-[180px] rounded-lg border border-slate-700 object-cover"
            />
          </a>
        ))}
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-slate-300">Caption & sources</summary>
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-sm text-slate-200">
          {caption.description}
        </pre>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <CopyButton text={caption.description} />
          {o.sources.map((s) => (
            <a key={s} href={s} target="_blank" className="text-xs text-teal-300 underline">
              {new URL(s).hostname}
            </a>
          ))}
        </div>
      </details>
    </section>
  );
}

export default async function Studio({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const sp = await searchParams;
  const days = upcomingDates(new Date(), 7);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-black">
            FundInTech <span className="text-teal-400">Post Studio</span>
          </h1>
          <p className="mt-1 text-slate-400">
            Next 7 days of posts: 1 earning opportunity + 1 scholarship / fellowship per day.
          </p>
          <a href={sp.all ? "/studio" : "/studio?all=1"} className="mt-3 inline-block rounded bg-slate-800 px-3 py-1 text-sm font-semibold hover:bg-slate-700">
            {sp.all ? "Show schedule" : `Show all ${opportunities.length} opportunities`}
          </a>
        </header>

        {sp.all
          ? opportunities.map((o) => <PostCard key={o.id} o={o} />)
          : days.map((d) => (
              <div key={isoDate(d)} className="space-y-3">
                <h2 className="border-b border-slate-800 pb-1 text-xl font-bold">
                  {d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
                </h2>
                {postsForDate(d).map((o, i) => (
                  <PostCard key={o.id} o={o} label={SLOT_LABEL[i]} />
                ))}
              </div>
            ))}
      </div>
    </main>
  );
}
