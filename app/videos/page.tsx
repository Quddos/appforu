import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
import CopyButton from "../studio/CopyButton";
import plan from "@/data/videos.json";

export const metadata: Metadata = { title: "BingeBrain videos" };
export const dynamic = "force-dynamic";

type Ep = { id: string; title: string; caption: string; series: string };

function episode(id: string): Ep | null {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "video", "episodes", `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

export default function Videos() {
  const today = new Date().toISOString().slice(0, 10);
  const days = Object.entries(plan as Record<string, string>).filter(([d]) => !d.startsWith("_") && d >= today);
  return (
    <main className="min-h-screen bg-[#0E0726] px-4 py-8 text-white">
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-3xl font-black">
          BINGE<span className="text-yellow-300">BRAIN</span> videos
        </h1>
        <p className="text-sm text-purple-200">Each video lands in the @qomment.chat TikTok inbox at about 17:00 UTC. Copy its caption when you post it.</p>
        {days.map(([d, id]) => {
          const ep = episode(id);
          if (!ep) return null;
          return (
            <section key={d} className="rounded-2xl border border-purple-700 bg-purple-950/60 p-4">
              <div className="text-xs font-bold text-pink-300">{d} · {ep.series.toUpperCase()}</div>
              <h2 className="text-lg font-bold">{ep.title}</h2>
              <video src={`/videos/${d}.mp4`} controls preload="none" className="mt-3 w-48 rounded-lg" />
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-sm">{ep.caption}</pre>
              <div className="mt-2">
                <CopyButton text={ep.caption} />
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
