import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
import CopyButton from "../studio/CopyButton";
import plan from "@/data/videos.json";

export const metadata: Metadata = { title: "Story videos" };
export const dynamic = "force-dynamic";

type Ep = { id: string; title: string; caption: string; brand?: string };
type DayPlan = { f?: { id: string }; q1?: string; q2?: string };

const SLOTS = [
  { key: "f", label: "@fundntech · morning (~9:00 AM IST)", color: "text-cyan-300" },
  { key: "q1", label: "@qomment.chat · morning (~9:00 AM IST)", color: "text-pink-300" },
  { key: "q2", label: "@qomment.chat · night (~7:00 PM IST)", color: "text-pink-300" },
] as const;

function episode(id: string): Ep | null {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "video", "episodes", `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

export default function Videos() {
  const today = new Date().toISOString().slice(0, 10);
  const days = Object.entries(plan as unknown as Record<string, DayPlan>).filter(([d]) => !d.startsWith("_") && d >= today);
  return (
    <main className="min-h-screen bg-[#0E0726] px-4 py-8 text-white">
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-3xl font-black">Story videos</h1>
        <p className="text-sm text-purple-200">
          Each video lands in that channel&apos;s TikTok inbox at the time shown. Open the notification, paste the caption below, and post. The
          @fundntech night post is still a photo carousel.
        </p>
        {days.map(([d, p]) =>
          SLOTS.map((s) => {
            const id = s.key === "f" ? p.f?.id : p[s.key];
            const ep = id ? episode(id) : null;
            if (!ep) return null;
            return (
              <section key={`${d}-${s.key}`} className="rounded-2xl border border-purple-700 bg-purple-950/60 p-4">
                <div className={`text-xs font-bold ${s.color}`}>
                  {d} · {s.label}
                </div>
                <h2 className="text-lg font-bold">{ep.title}</h2>
                <video src={`/media/${d}-${s.key}.mp4`} controls preload="none" className="mt-3 w-48 rounded-lg" />
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-sm">{ep.caption}</pre>
                <div className="mt-2">
                  <CopyButton text={ep.caption} />
                </div>
              </section>
            );
          }),
        )}
      </div>
    </main>
  );
}
