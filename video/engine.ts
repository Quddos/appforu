/**
 * BingeBrain video engine: episode JSON -> animated 1080x1920 frames (satori) -> MP4 with Piper voice-over.
 * No JSX here so it runs with plain `tsx`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export const W = 1080;
export const H = 1920;
export const FPS = 24;

const ROOT = path.resolve(__dirname, "..");

/* ------------------------------------------------------------- types */

export type Line = { who?: string; say: string; text?: string };
export type Scene =
  | { type: "hook"; say: string; text: string; sub?: string; icon?: string }
  | { type: "puzzle"; say: string; rows: { items: string[]; equals: string }[]; question: { items: string[] }; note?: string }
  | { type: "countdown"; seconds: number; say?: string }
  | { type: "reveal"; say: string; answer: string; steps?: string[] }
  | { type: "talk"; say: string; who: string; mood?: "happy" | "shock" | "think" | "cry"; props?: string[]; place?: string }
  | { type: "card"; say: string; title: string; lines: string[]; icon?: string }
  | { type: "outro"; say: string; text: string; next?: string };

export type Episode = {
  id: string;
  series: "brain" | "comic" | "watch";
  title: string;
  caption: string;
  scenes: Scene[];
};

/* ------------------------------------------------------------- style */

const C = { ink: "#0E0726", grape: "#5B21B6", pink: "#FF2E88", butter: "#FFD23F", mint: "#21E6C1", white: "#FFFFFF" };
const SERIES = {
  brain: { bg: ["#051B2C", "#0E9F8B"], accent: C.pink, tag: "ONLY 1% CAN SOLVE THIS", icon: "1f9e0" },
  comic: { bg: ["#3B0A57", "#FF2E88"], accent: C.butter, tag: "KERNEL'S SIDE HUSTLE SAGA", icon: "1f37f" },
  watch: { bg: ["#0B1640", "#5B21B6"], accent: C.mint, tag: "WHAT TO WATCH TONIGHT", icon: "1f3ac" },
} as const;

/* ------------------------------------------------------- satori helpers */

type Node = { type: string; props: Record<string, unknown> };
function h(type: string, props: Record<string, unknown> | null, ...children: unknown[]): Node {
  const kids = children.flat().filter((c) => c !== null && c !== undefined && c !== false);
  return { type, props: { ...(props ?? {}), children: kids.length === 1 ? kids[0] : kids } };
}
const div = (style: Record<string, unknown>, ...children: unknown[]) => h("div", { style: { display: "flex", ...style } }, ...children);

const iconCache = new Map<string, string>();
function icon(code: string, size: number, style: Record<string, unknown> = {}) {
  if (!iconCache.has(code)) {
    try {
      const b = readFileSync(path.join(ROOT, "assets", "f3d", `${code}.png`));
      iconCache.set(code, `data:image/png;base64,${b.toString("base64")}`);
    } catch {
      iconCache.set(code, "");
    }
  }
  const src = iconCache.get(code);
  return src ? h("img", { src, width: size, height: size, style }) : div({ width: size, height: size });
}

let fonts: { name: string; data: Buffer; weight: 400 | 700 | 800; style: "normal" }[] | null = null;
function loadFonts() {
  if (!fonts) {
    const f = (n: string) => readFileSync(path.join(ROOT, "assets", "fonts", n));
    fonts = [
      { name: "Anton", data: f("anton-latin-400-normal.woff"), weight: 400, style: "normal" },
      { name: "Inter", data: f("inter-latin-700-normal.woff"), weight: 700, style: "normal" },
      { name: "Inter", data: f("inter-latin-800-normal.woff"), weight: 800, style: "normal" },
    ];
  }
  return fonts;
}

/* ------------------------------------------------------------ easing */

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOutBack = (x: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const pop = (t: number, start: number, dur = 0.35) => easeOutBack(clamp((t - start) / dur));
const fade = (t: number, start: number, dur = 0.25) => clamp((t - start) / dur);

/* -------------------------------------------------------- background */

function background(series: Episode["series"], time: number) {
  const s = SERIES[series];
  const rot = (time * 8) % 360;
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = ((i * 30 + rot) * Math.PI) / 180;
    const b = a + 0.14;
    const cx = W / 2, cy = H * 0.42, R = 2200;
    return h("polygon", {
      points: `${cx},${cy} ${cx + Math.cos(a) * R},${cy + Math.sin(a) * R} ${cx + Math.cos(b) * R},${cy + Math.sin(b) * R}`,
      fill: "#FFFFFF",
      opacity: 0.06,
    });
  });
  const dots = Array.from({ length: 26 }, (_, i) =>
    h("circle", { cx: (i * 397) % W, cy: ((i * 211 + time * 40 * ((i % 3) + 1)) % (H + 40)) - 20, r: (i % 4) + 2, fill: "#FFFFFF", opacity: 0.22 }),
  );
  return h(
    "svg",
    { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: "absolute", top: 0, left: 0, width: W, height: H } },
    ...rays,
    ...dots,
  );
}

function header(series: Episode["series"]) {
  const s = SERIES[series];
  return div(
    { justifyContent: "space-between", alignItems: "center", padding: "70px 60px 0" },
    div({ alignItems: "center", gap: 14 }, icon("1f37f", 76), div({ fontFamily: "Anton", fontSize: 56, color: C.white }, "BINGE", h("span", { style: { color: C.butter } }, "BRAIN"))),
    div({ background: C.ink, color: s.accent, fontFamily: "Anton", fontSize: 30, padding: "8px 20px", borderRadius: 14, letterSpacing: 1 }, s.tag),
  );
}

/** Karaoke captions: words light up as they are spoken. */
function captions(text: string, progress: number, accent: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const lit = Math.floor(progress * words.length + 0.5);
  // show a window of ~9 words around the current word
  const start = Math.max(0, Math.min(lit - 4, words.length - 9));
  const view = words.slice(start, start + 9);
  return div(
    { position: "absolute", left: 60, right: 140, bottom: 500, flexWrap: "wrap", justifyContent: "center", gap: "6px 16px" },
    ...view.map((w, i) => {
      const idx = start + i;
      const on = idx < lit;
      const now = idx === lit - 1;
      return div(
        {
          fontFamily: "Anton",
          fontSize: 66,
          color: now ? C.ink : on ? C.white : "rgba(255,255,255,0.45)",
          background: now ? accent : "transparent",
          padding: "0 10px",
          borderRadius: 10,
          textShadow: now ? "none" : "0 5px 0 rgba(0,0,0,0.45)",
        },
        w.toUpperCase(),
      );
    }),
  );
}

/* ------------------------------------------------------------ scenes */

function expr(items: string[], size: number, t: number, delay: number) {
  return items.map((it, i) => {
    const s = pop(t, delay + i * 0.12);
    if (/^[+\-×÷=?]$/.test(it) || /^\d+$/.test(it))
      return div({ fontFamily: "Anton", fontSize: size * 0.8, color: C.white, transform: `scale(${s})`, width: size * 0.62, justifyContent: "center" }, it);
    return icon(it, size, { transform: `scale(${s})` });
  });
}

function sceneBody(ep: Episode, sc: Scene, t: number, dur: number) {
  const s = SERIES[ep.series];
  switch (sc.type) {
    case "hook": {
      const k = pop(t, 0.05, 0.45);
      const bob = Math.sin(t * 4) * 14;
      return div(
        { flexDirection: "column", alignItems: "center", marginTop: 120 },
        icon(sc.icon ?? s.icon, 420, { transform: `translateY(${bob}px) scale(${k})` }),
        div({ fontFamily: "Anton", fontSize: 120, color: C.white, textAlign: "center", lineHeight: 1.02, marginTop: 40, padding: "0 60px", transform: `scale(${pop(t, 0.25)})`, textShadow: "0 10px 0 rgba(0,0,0,0.35)" }, sc.text),
        sc.sub ? div({ background: s.accent, color: C.ink, fontFamily: "Anton", fontSize: 64, padding: "4px 26px", marginTop: 26, transform: `rotate(-2deg) scale(${pop(t, 0.5)})` }, sc.sub) : null,
      );
    }
    case "puzzle": {
      const rows = sc.rows.map((r, i) =>
        div(
          { alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(0,0,0,0.28)", borderRadius: 30, padding: "16px 24px", opacity: fade(t, i * 0.6), border: "3px solid rgba(255,255,255,0.18)" },
          ...expr(r.items, 120, t, i * 0.6),
          div({ fontFamily: "Anton", fontSize: 100, color: C.white, width: 70, justifyContent: "center" }, "="),
          div({ fontFamily: "Anton", fontSize: 110, color: C.butter }, r.equals),
        ),
      );
      const qStart = sc.rows.length * 0.6 + 0.2;
      return div(
        { flexDirection: "column", gap: 26, marginTop: 70, padding: "0 50px" },
        ...rows,
        div(
          { alignItems: "center", justifyContent: "center", gap: 8, background: s.accent, borderRadius: 30, padding: "18px 24px", marginTop: 10, transform: `scale(${pop(t, qStart)})`, boxShadow: "0 14px 0 rgba(0,0,0,0.3)" },
          ...expr(sc.question.items, 130, t, qStart + 0.1),
          div({ fontFamily: "Anton", fontSize: 110, color: C.ink, width: 70, justifyContent: "center" }, "="),
          div({ fontFamily: "Anton", fontSize: 130, color: C.ink }, "?"),
        ),
        sc.note ? div({ justifyContent: "center", fontFamily: "Inter", fontWeight: 800, fontSize: 40, color: C.white, opacity: fade(t, qStart + 0.4) }, sc.note) : null,
      );
    }
    case "countdown": {
      const left = Math.max(1, Math.ceil(sc.seconds - t));
      const frac = (sc.seconds - t) % 1;
      const k = 1 + 0.25 * Math.max(0, frac - 0.75) * 4;
      const ring = 2 * Math.PI * 230;
      return div(
        { flexDirection: "column", alignItems: "center", marginTop: 150 },
        div({ fontFamily: "Anton", fontSize: 90, color: C.white }, "COMMENT YOUR ANSWER"),
        div(
          { width: 560, height: 560, alignItems: "center", justifyContent: "center", position: "relative", marginTop: 60 },
          h(
            "svg",
            { width: 560, height: 560, viewBox: "0 0 560 560", style: { position: "absolute", top: 0, left: 0 } },
            h("circle", { cx: 280, cy: 280, r: 230, fill: "rgba(0,0,0,0.3)", stroke: "rgba(255,255,255,0.2)", "stroke-width": 30 }),
            h("circle", { cx: 280, cy: 280, r: 230, fill: "none", stroke: s.accent, "stroke-width": 30, "stroke-dasharray": `${ring}`, "stroke-dashoffset": `${ring * (t / sc.seconds)}`, transform: "rotate(-90 280 280)", "stroke-linecap": "round" }),
          ),
          div({ fontFamily: "Anton", fontSize: 300, color: C.white, transform: `scale(${k})` }, String(left)),
        ),
        div({ marginTop: 50, alignItems: "center", gap: 18 }, icon("1f914", 120, { transform: `rotate(${Math.sin(t * 6) * 10}deg)` }), div({ fontFamily: "Inter", fontWeight: 800, fontSize: 46, color: C.white }, "Pause the video if you need more time!")),
      );
    }
    case "reveal": {
      return div(
        { flexDirection: "column", alignItems: "center", marginTop: 110, padding: "0 60px" },
        div({ fontFamily: "Anton", fontSize: 90, color: C.white, opacity: fade(t, 0) }, "THE ANSWER IS..."),
        div({ background: C.butter, color: C.ink, fontFamily: "Anton", fontSize: sc.answer.length <= 3 ? 300 : sc.answer.length <= 6 ? 200 : 130, padding: "0 60px", borderRadius: 40, marginTop: 30, transform: `scale(${pop(t, 0.5, 0.5)}) rotate(-3deg)`, boxShadow: "0 18px 0 rgba(0,0,0,0.3)" }, sc.answer),
        ...(sc.steps ?? []).map((st, i) =>
          div({ marginTop: 22, fontFamily: "Inter", fontWeight: 800, fontSize: 46, color: C.white, background: "rgba(0,0,0,0.3)", padding: "12px 26px", borderRadius: 20, opacity: fade(t, 1.2 + i * 0.7) }, st),
        ),
        div({ position: "absolute", top: 260, left: 80 }, icon("2728", 150, { transform: `scale(${pop(t, 0.7)}) rotate(${t * 40}deg)` })),
        div({ position: "absolute", top: 520, right: 80 }, icon("1f389", 150, { transform: `scale(${pop(t, 0.8)})` })),
      );
    }
    case "talk": {
      const speaking = Math.abs(Math.sin(t * 14)) * 0.06;
      const moodIcon = { happy: "1f602", shock: "1f92f", think: "1f914", cry: "1f62d" }[sc.mood ?? "happy"];
      const bubbleText = sc.say;
      const shown = bubbleText.slice(0, Math.ceil(bubbleText.length * clamp(t / Math.max(0.5, dur * 0.6))));
      return div(
        { flexDirection: "column", alignItems: "center", marginTop: 40, position: "relative", height: 1300 },
        sc.place ? div({ background: C.ink, color: C.butter, fontFamily: "Anton", fontSize: 40, padding: "6px 22px", borderRadius: 12 }, sc.place) : null,
        div(
          { width: 960, minHeight: 260, background: C.white, color: C.ink, borderRadius: 50, padding: "36px 44px", marginTop: 30, fontFamily: "Inter", fontWeight: 800, fontSize: 50, lineHeight: 1.25, transform: `scale(${pop(t, 0, 0.3)})`, boxShadow: "0 14px 0 rgba(0,0,0,0.25)" },
          `${sc.who.toUpperCase()}: ${shown}`,
        ),
        div({ width: 0, height: 0, borderLeft: "40px solid transparent", borderRight: "40px solid transparent", borderTop: `50px solid ${C.white}` }),
        div(
          { position: "relative", width: 700, height: 700, alignItems: "center", justifyContent: "center", marginTop: 20 },
          icon(sc.who.toLowerCase() === "kernel" ? "1f37f" : "1f9d1-200d-1f4bc", 560, { transform: `scale(${1 + speaking}) translateY(${Math.sin(t * 5) * 10}px)` }),
          div({ position: "absolute", right: 30, top: 30 }, icon(moodIcon, 200, { transform: `scale(${pop(t, 0.2)})` })),
          ...(sc.props ?? []).map((p, i) => div({ position: "absolute", left: 20 + i * 140, bottom: 10 }, icon(p, 150, { transform: `translateY(${Math.sin(t * 3 + i) * 12}px)` }))),
        ),
      );
    }
    case "card": {
      return div(
        { flexDirection: "column", marginTop: 100, padding: "0 60px", gap: 22 },
        div({ alignItems: "center", gap: 20, transform: `scale(${pop(t, 0)})` }, icon(sc.icon ?? s.icon, 160), div({ fontFamily: "Anton", fontSize: 96, color: C.white, lineHeight: 1 }, sc.title)),
        ...sc.lines.map((l, i) => div({ background: "rgba(0,0,0,0.32)", borderRadius: 26, padding: "22px 30px", fontFamily: "Inter", fontWeight: 800, fontSize: 48, color: C.white, opacity: fade(t, 0.4 + i * 0.5), border: `3px solid ${s.accent}` }, l)),
      );
    }
    case "outro": {
      return div(
        { flexDirection: "column", alignItems: "center", marginTop: 160, padding: "0 60px" },
        icon("1f37f", 380, { transform: `scale(${pop(t, 0)}) rotate(${Math.sin(t * 5) * 6}deg)` }),
        div({ fontFamily: "Anton", fontSize: 110, color: C.white, textAlign: "center", lineHeight: 1.05, marginTop: 30 }, sc.text),
        div({ background: C.pink, color: C.white, fontFamily: "Anton", fontSize: 64, padding: "14px 40px", borderRadius: 60, marginTop: 40, transform: `scale(${pop(t, 0.4)})` }, "FOLLOW @QOMMENT.CHAT"),
        sc.next ? div({ marginTop: 34, fontFamily: "Inter", fontWeight: 800, fontSize: 46, color: C.butter, opacity: fade(t, 0.8) }, sc.next) : null,
      );
    }
  }
}

export function frame(ep: Episode, sc: Scene, t: number, dur: number, globalTime: number): Node {
  const s = SERIES[ep.series];
  const say = "say" in sc ? sc.say : undefined;
  return div(
    { width: W, height: H, position: "relative", flexDirection: "column", backgroundImage: `linear-gradient(160deg, ${s.bg[0]}, ${s.bg[1]})` },
    background(ep.series, globalTime),
    div({ flexDirection: "column", width: W, height: H, position: "relative" }, header(ep.series), sceneBody(ep, sc, t, dur)),
    say && sc.type !== "talk" ? captions(say, clamp(t / Math.max(0.3, dur - 0.3)), s.accent) : null,
  );
}

export async function renderPng(node: Node): Promise<Buffer> {
  const svg = await satori(node as unknown as React.ReactNode, { width: W, height: H, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}
