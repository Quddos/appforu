import type { Metadata } from "next";
import CopyButton from "./CopyButton";
import {
  captionFor,
  opportunities,
  postsForDate,
  SLIDES_PER_POST,
  type Opportunity,
} from "@/lib/opportunities";

export const metadata: Metadata = { title: "FundInTech Post Studio" };
export const dynamic = "force-dynamic";

function PostCard({ o, label }: { o: Opportunity; label?: string }) {
  const caption = captionFor(o);
  const slides = Array.from({ length: SLIDES_PER_POST }, (_, i) => i + 1);
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {label && <span className="rounded bg-yellow-400 px-2 py-0.5 text-xs font-bold text-black">{label}</span>}
        <span className="rounded bg-teal-500/20 px-2 py-0.5 text-xs font-semibold text-teal-300">{o.category}</span>
        {!o.verified && (
          <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">
            not verified (won&apos;t be scheduled)
          </span>
        )}
      </div>
      <h2 className="text-xl font-bold text-white">{o.title}</h2>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {slides.map((n) => (
          <a key={n} href={`/api/slide/${o.id}/${n}.jpg`} target="_blank" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/slide/${o.id}/${n}.jpg`}
              alt={`${o.title} slide ${n}`}
              width={216}
              height={288}
              loading="lazy"
              className="h-[288px] w-[216px] rounded-lg border border-slate-700 object-cover"
            />
          </a>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-400">Tap a slide to open the full-size image, then save it to your phone.</p>
      <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-sm text-slate-200">
        {caption.description}
      </pre>
      <div className="mt-3">
        <CopyButton text={caption.description} />
      </div>
    </section>
  );
}

export default async function Studio({ searchParams }: { searchParams: Promise<{ date?: string; all?: string }> }) {
  const sp = await searchParams;
  const date = sp.date ? new Date(`${sp.date}T12:00:00Z`) : new Date();
  const valid = !Number.isNaN(date.getTime());
  const today = valid ? postsForDate(date) : [];
  const iso = valid ? date.toISOString().slice(0, 10) : "invalid date";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-3xl font-black">
            FundInTech <span className="text-teal-400">Post Studio</span>
          </h1>
          <p className="mt-1 text-slate-400">
            Posts for <b className="text-white">{iso}</b> · {opportunities.filter((o) => o.verified).length} verified
            opportunities in rotation
          </p>
          <form className="mt-3 flex flex-wrap gap-2 text-sm">
            <input
              type="date"
              name="date"
              defaultValue={valid ? iso : undefined}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            />
            <button className="rounded bg-slate-800 px-3 py-1 font-semibold hover:bg-slate-700">Show day</button>
            <a href="/studio?all=1" className="rounded bg-slate-800 px-3 py-1 font-semibold hover:bg-slate-700">
              Show all
            </a>
          </form>
        </header>

        {(sp.all ? opportunities : today).map((o, i) => (
          <PostCard key={o.id} o={o} label={sp.all ? undefined : `POST ${i + 1}`} />
        ))}
      </div>
    </main>
  );
}
