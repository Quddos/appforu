import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CSSProperties, ReactNode } from "react";

/** BingeBrain: the second TikTok channel (comic shorts, what to watch, brain teasers). */
export const BRAND = {
  name: "BingeBrain",
  handle: "@qomment.chat",
  tagline: "WATCH • LAUGH • THINK",
  colors: { ink: "#0E0726", grape: "#5B21B6", pink: "#FF2E88", butter: "#FFD23F", mint: "#21E6C1", white: "#FFFFFF" },
};
const C = BRAND.colors;

export const SERIES = {
  comic: { title: "KERNEL'S", sub: "SIDE HUSTLE SAGA", tag: "3D COMIC SERIES", icon: "1f37f", accent: C.butter, bg: ["#3B0A57", "#FF2E88"] },
  watch: { title: "WHAT TO", sub: "WATCH TONIGHT", tag: "NEW RELEASES, NO SPOILERS", icon: "1f3ac", accent: C.mint, bg: ["#0B1640", "#5B21B6"] },
  brain: { title: "ONLY 1%", sub: "CAN SOLVE THIS", tag: "DAILY BRAIN TEASER", icon: "1f9e0", accent: C.pink, bg: ["#051B2C", "#0E9F8B"] },
} as const;
export type SeriesKey = keyof typeof SERIES;

const icons = new Map<string, string>();
export async function loadBrandIcons() {
  const codes = ["1f37f", "1f9e0", "1f3ac", "1f4fa", "2753", "1f914", "1f4a1", "1f92f", "1f602", "2728", "1f525", "1f440"];
  await Promise.all(
    codes.filter((c) => !icons.has(c)).map(async (c) => {
      const b = await readFile(path.join(process.cwd(), "assets", "f3d", `${c}.png`)).catch(() => null);
      icons.set(c, b ? `data:image/png;base64,${b.toString("base64")}` : "");
    }),
  );
}
function I({ c, s, style }: { c: string; s: number; style?: CSSProperties }) {
  const src = icons.get(c);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} width={s} height={s} alt="" style={style} /> : <div style={{ display: "flex", width: s, height: s }} />;
}

/** Wordmark "Binge" + "Brain" in two colours. */
function Wordmark({ size, stacked = false }: { size: number; stacked?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: stacked ? "column" : "row", alignItems: "center", fontFamily: "Anton", fontSize: size, lineHeight: 0.95, letterSpacing: 1 }}>
      <span style={{ color: C.white }}>BINGE</span>
      <span style={{ color: C.butter }}>BRAIN</span>
    </div>
  );
}

function Burst({ w, h, colors }: { w: number; h: number; colors: readonly string[] }) {
  const rays = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);
  const cx = w / 2, cy = h * 0.42, R = Math.max(w, h);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", top: 0, left: 0, width: w, height: h }}>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      
      {rays.map((a, i) =>
        i % 2 ? null : (
          <polygon key={i} fill="#FFFFFF" opacity="0.07"
            points={`${cx},${cy} ${cx + Math.cos(a) * R},${cy + Math.sin(a) * R} ${cx + Math.cos(a + 0.13) * R},${cy + Math.sin(a + 0.13) * R}`} />
        ),
      )}
      {Array.from({ length: 30 }, (_, i) => (
        <circle key={`d${i}`} cx={(i * 397) % w} cy={(i * 211) % h} r={(i % 4) + 2} fill="#FFFFFF" opacity="0.25" />
      ))}
    </svg>
  );
}

/** 1080x1080 profile picture (safe inside TikTok's circle crop). */
export function Logo() {
  const s = 1080;
  return (
    <div style={{ width: s, height: s, backgroundImage: "linear-gradient(160deg, #2A0B4F, #FF2E88)", display: "flex", position: "relative", alignItems: "center", justifyContent: "center", fontFamily: "Inter" }}>
      <Burst w={s} h={s} colors={["#2A0B4F", "#FF2E88"]} />
      <div style={{ position: "absolute", width: 860, height: 860, borderRadius: 860, border: `14px solid ${C.butter}`, display: "flex" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        <div style={{ display: "flex", position: "relative", width: 520, height: 460 }}>
          <I c="1f37f" s={440} style={{ position: "absolute", left: 40, top: 10 }} />
          <I c="1f9e0" s={210} style={{ position: "absolute", right: -10, top: -10, transform: "rotate(14deg)" }} />
          <I c="2728" s={120} style={{ position: "absolute", left: -20, top: 20 }} />
        </div>
        <div style={{ display: "flex", marginTop: -10, background: C.ink, padding: "6px 36px 14px", borderRadius: 30, transform: "rotate(-3deg)", border: `6px solid ${C.butter}` }}>
          <Wordmark size={150} />
        </div>
      </div>
    </div>
  );
}

/** 1080x1920 cover for a series (first frame / thumbnail). */
export function SeriesCover({ k }: { k: SeriesKey }) {
  const s = SERIES[k];
  const W = 1080, H = 1920;
  return (
    <div style={{ width: W, height: H, backgroundImage: `linear-gradient(160deg, ${s.bg[0]}, ${s.bg[1]})`, display: "flex", flexDirection: "column", position: "relative", fontFamily: "Inter", color: C.white }}>
      <Burst w={W} h={H} colors={s.bg} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "90px 70px", position: "relative", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <I c="1f37f" s={90} />
            <Wordmark size={64} />
          </div>
          <div style={{ display: "flex", background: s.accent, color: C.ink, fontFamily: "Anton", fontSize: 34, padding: "8px 22px", borderRadius: 14 }}>EP. 01</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", position: "relative", height: 760 }}>
          <div style={{ position: "absolute", top: 40, width: 700, height: 700, borderRadius: 700, background: "rgba(255,255,255,0.12)", border: `10px dashed ${s.accent}`, display: "flex" }} />
          <I c={s.icon} s={600} style={{ position: "absolute", top: 90 }} />
          {k === "brain" ? <I c="2753" s={220} style={{ position: "absolute", right: 40, top: 0, transform: "rotate(15deg)" }} /> : null}
          {k === "watch" ? <I c="1f37f" s={230} style={{ position: "absolute", left: 40, bottom: 0 }} /> : null}
          {k === "comic" ? <I c="1f602" s={200} style={{ position: "absolute", right: 30, top: 10 }} /> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", background: C.ink, color: s.accent, fontFamily: "Anton", fontSize: 40, padding: "6px 26px", borderRadius: 12, letterSpacing: 2 }}>{s.tag}</div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 190, lineHeight: 1, marginTop: 24, textShadow: "0 10px 0 rgba(0,0,0,0.35)" }}>{s.title}</div>
          <div style={{ display: "flex", background: s.accent, color: C.ink, fontFamily: "Anton", fontSize: 120, lineHeight: 1.05, padding: "0 30px", transform: "rotate(-2deg)", boxShadow: "12px 12px 0 rgba(0,0,0,0.3)" }}>{s.sub}</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, marginTop: 50, color: "#F3E8FF" }}>Follow {BRAND.handle} • new episode daily</div>
        </div>
      </div>
    </div>
  );
}

/** 1920x1080 overview sheet: logo, palette, series. */
export function BrandSheet() {
  const sw = (hex: string, n: string): ReactNode => (
    <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ width: 120, height: 120, borderRadius: 24, background: hex, border: "4px solid #ffffff55", display: "flex" }} />
      <div style={{ display: "flex", fontSize: 22, fontWeight: 800 }}>{n}</div>
      <div style={{ display: "flex", fontSize: 18, color: "#C4B5FD" }}>{hex}</div>
    </div>
  );
  return (
    <div style={{ width: 1920, height: 1080, backgroundImage: "linear-gradient(160deg, #140733, #3B0A57)", display: "flex", position: "relative", fontFamily: "Inter", color: C.white }}>
      <Burst w={1920} h={1080} colors={["#140733", "#3B0A57"]} />
      <div style={{ display: "flex", flex: 1, padding: 80, gap: 80, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 760 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <I c="1f37f" s={180} />
            <Wordmark size={150} />
          </div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 44, color: C.mint, letterSpacing: 6, marginTop: 10 }}>{BRAND.tagline}</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, marginTop: 40, lineHeight: 1.4, color: "#E9D5FF" }}>
            Short, funny 3D comics, no-spoiler picks for tonight, and brain teasers only 1% can solve. Hosted by Kernel, a popcorn kernel with big dreams.
          </div>
          <div style={{ display: "flex", gap: 26, marginTop: 60 }}>
            {sw(C.ink, "Night Ink")}{sw(C.grape, "Grape")}{sw(C.pink, "Pop Pink")}{sw(C.butter, "Butter")}{sw(C.mint, "Mint")}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 30, flex: 1 }}>
          {(Object.keys(SERIES) as SeriesKey[]).map((k) => {
            const s = SERIES[k];
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 30, padding: "24px 30px", borderRadius: 30, background: `linear-gradient(90deg, ${s.bg[0]}, ${s.bg[1]})`, border: `4px solid ${s.accent}` }}>
                <I c={s.icon} s={170} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontFamily: "Anton", fontSize: 28, color: s.accent }}>{s.tag}</div>
                  <div style={{ display: "flex", fontFamily: "Anton", fontSize: 64, lineHeight: 1 }}>{`${s.title} ${s.sub}`}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
