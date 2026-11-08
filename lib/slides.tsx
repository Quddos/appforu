import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CSSProperties, ReactNode } from "react";
import type { Opportunity } from "./opportunities";
import { COMMENT_KEYWORD, SLIDES_PER_POST } from "./opportunities";

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1440; // 3:4 portrait, matches TikTok photo posts

/* ------------------------------------------------------------------ fonts */

type Font = { name: string; data: Buffer; weight: 400 | 700 | 800 };
let fontCache: Promise<Font[]> | null = null;

export function loadFonts() {
  if (!fontCache) {
    const dir = path.join(process.cwd(), "assets", "fonts");
    const f = (file: string) => readFile(path.join(dir, file));
    fontCache = Promise.all([
      f("anton-latin-400-normal.woff"),
      f("inter-latin-400-normal.woff"),
      f("inter-latin-700-normal.woff"),
      f("inter-latin-800-normal.woff"),
    ]).then(([anton, i4, i7, i8]) => [
      { name: "Anton", data: anton, weight: 400 },
      { name: "Inter", data: i4, weight: 400 },
      { name: "Inter", data: i7, weight: 700 },
      { name: "Inter", data: i8, weight: 800 },
    ]);
  }
  return fontCache;
}

/* ------------------------------------------------------------------ emoji */

const emojiCache = new Map<string, string>();

async function loadEmoji(codes: string[]) {
  const dir = path.join(process.cwd(), "assets", "emoji");
  await Promise.all(
    codes
      .filter((c) => !emojiCache.has(c))
      .map(async (c) => {
        try {
          const svg = await readFile(path.join(dir, `${c}.svg`));
          emojiCache.set(c, `data:image/svg+xml;base64,${svg.toString("base64")}`);
        } catch {
          emojiCache.set(c, "");
        }
      }),
  );
}

function Emoji({ code, size, style }: { code: string; size: number; style?: CSSProperties }) {
  const src = emojiCache.get(code);
  if (!src) return <div style={{ display: "flex", width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="" style={style} />;
}

/* ------------------------------------------------------------------ theme */

type Theme = { a: string; b: string; c: string; bg1: string; bg2: string; ink: string };

const THEMES: Record<Opportunity["kind"], Theme> = {
  earn: { a: "#00f5a0", b: "#ffd23f", c: "#00c2ff", bg1: "#020617", bg2: "#06281f", ink: "#03150f" },
  academic: { a: "#38bdf8", b: "#c084fc", c: "#f472b6", bg1: "#030418", bg2: "#1a0b3d", ink: "#0b0820" },
};

const WHITE = "#ffffff";
const MUTED = "#b6c2e2";

/* ------------------------------------------------------------- background */

function seeded(n: number) {
  let s = n;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function Background({ t, seed }: { t: Theme; seed: number }) {
  const rnd = seeded(seed);
  const stars = Array.from({ length: 70 }, () => ({
    x: rnd() * SLIDE_WIDTH,
    y: rnd() * 900,
    r: rnd() * 2.2 + 0.4,
    o: rnd() * 0.7 + 0.2,
  }));
  const horizonY = 1080;
  const vpX = SLIDE_WIDTH / 2;
  const hLines = Array.from({ length: 9 }, (_, i) => horizonY + Math.pow(i + 1, 1.75) * 9);
  const vLines = Array.from({ length: 23 }, (_, i) => (i - 11) * 140);

  return (
    <svg
      width={SLIDE_WIDTH}
      height={SLIDE_HEIGHT}
      viewBox={`0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}`}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={t.bg1} />
          <stop offset="0.6" stopColor={t.bg2} />
          <stop offset="1" stopColor={t.bg1} />
        </linearGradient>
        <radialGradient id="g1" cx="0.85" cy="0.12" r="0.55">
          <stop offset="0" stopColor={t.a} stopOpacity="0.38" />
          <stop offset="1" stopColor={t.a} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g2" cx="0.05" cy="0.55" r="0.55">
          <stop offset="0" stopColor={t.b} stopOpacity="0.28" />
          <stop offset="1" stopColor={t.b} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g3" cx="0.7" cy="0.95" r="0.5">
          <stop offset="0" stopColor={t.c} stopOpacity="0.3" />
          <stop offset="1" stopColor={t.c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={SLIDE_WIDTH} height={SLIDE_HEIGHT} fill="url(#bg)" />
      <rect width={SLIDE_WIDTH} height={SLIDE_HEIGHT} fill="url(#g1)" />
      <rect width={SLIDE_WIDTH} height={SLIDE_HEIGHT} fill="url(#g2)" />
      <rect width={SLIDE_WIDTH} height={SLIDE_HEIGHT} fill="url(#g3)" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={WHITE} opacity={s.o} />
      ))}
      {/* neon perspective grid */}
      <line x1="0" y1={horizonY} x2={SLIDE_WIDTH} y2={horizonY} stroke={t.a} strokeWidth="2" opacity="0.55" />
      {hLines.map((y, i) => (
        <line key={`h${i}`} x1="0" y1={y} x2={SLIDE_WIDTH} y2={y} stroke={t.a} strokeWidth="1.5" opacity={0.12 + i * 0.03} />
      ))}
      {vLines.map((dx, i) => (
        <line
          key={`v${i}`}
          x1={vpX + dx * 0.12}
          y1={horizonY}
          x2={vpX + dx * 2.4}
          y2={SLIDE_HEIGHT}
          stroke={t.a}
          strokeWidth="1.5"
          opacity="0.18"
        />
      ))}
      {/* scanlines */}
      {Array.from({ length: 48 }, (_, i) => (
        <rect key={`s${i}`} x="0" y={i * 30} width={SLIDE_WIDTH} height="1" fill={WHITE} opacity="0.025" />
      ))}
    </svg>
  );
}

/* --------------------------------------------------------- hologram hero */

function Hologram({ o, t, size = 520 }: { o: Opportunity; t: Theme; size?: number }) {
  const c = size / 2;
  const r = size * 0.36;
  const ticks = Array.from({ length: 48 }, (_, i) => (i / 48) * Math.PI * 2);
  const hex = Array.from({ length: 6 }, (_, i) => {
    const ang = (Math.PI / 3) * i - Math.PI / 2;
    return `${c + Math.cos(ang) * r * 0.82},${c - 20 + Math.sin(ang) * r * 0.82}`;
  }).join(" ");
  const badgeSize = size * 0.22;
  const badgePos = [
    { x: size * 0.02, y: size * 0.1 },
    { x: size - badgeSize - size * 0.02, y: size * 0.16 },
    { x: size * 0.06, y: size * 0.6 },
  ];

  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={t.a} />
            <stop offset="0.5" stopColor={t.c} />
            <stop offset="1" stopColor={t.b} />
          </linearGradient>
          <radialGradient id="core" cx="0.5" cy="0.45" r="0.5">
            <stop offset="0" stopColor={t.a} stopOpacity="0.55" />
            <stop offset="0.55" stopColor={t.c} stopOpacity="0.15" />
            <stop offset="1" stopColor={t.c} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={t.a} stopOpacity="0.55" />
            <stop offset="1" stopColor={t.a} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* light beam from the platform */}
        <polygon
          points={`${c - r * 0.55},${size * 0.9} ${c + r * 0.55},${size * 0.9} ${c + r * 1.1},${size * 0.05} ${c - r * 1.1},${size * 0.05}`}
          fill="url(#beam)"
          opacity="0.6"
        />
        <circle cx={c} cy={c - 20} r={r * 1.25} fill="url(#core)" />
        {/* rings */}
        <circle cx={c} cy={c - 20} r={r * 1.18} fill="none" stroke="url(#ring)" strokeWidth="3" strokeDasharray="4 14" opacity="0.8" />
        <circle cx={c} cy={c - 20} r={r} fill="none" stroke="url(#ring)" strokeWidth="6" opacity="0.95" />
        <circle cx={c} cy={c - 20} r={r * 0.9} fill="none" stroke={t.a} strokeWidth="1.5" opacity="0.5" />
        {ticks.map((a, i) => (
          <line
            key={i}
            x1={c + Math.cos(a) * r * 1.04}
            y1={c - 20 + Math.sin(a) * r * 1.04}
            x2={c + Math.cos(a) * r * (i % 4 === 0 ? 1.12 : 1.08)}
            y2={c - 20 + Math.sin(a) * r * (i % 4 === 0 ? 1.12 : 1.08)}
            stroke={t.a}
            strokeWidth={i % 4 === 0 ? 3 : 1.5}
            opacity="0.85"
          />
        ))}
        <polygon points={hex} fill="none" stroke={t.b} strokeWidth="2.5" opacity="0.7" />
        {/* platform */}
        <ellipse cx={c} cy={size * 0.9} rx={r * 0.95} ry={r * 0.2} fill={t.a} opacity="0.18" />
        <ellipse cx={c} cy={size * 0.9} rx={r * 0.95} ry={r * 0.2} fill="none" stroke={t.a} strokeWidth="4" />
        <ellipse cx={c} cy={size * 0.9} rx={r * 0.7} ry={r * 0.14} fill="none" stroke={t.b} strokeWidth="2.5" opacity="0.9" />
        <ellipse cx={c} cy={size * 0.9} rx={r * 1.2} ry={r * 0.26} fill="none" stroke={t.c} strokeWidth="1.5" opacity="0.6" />
      </svg>
      {/* main icon */}
      <div
        style={{
          position: "absolute",
          left: c - size * 0.24,
          top: c - 20 - size * 0.24,
          width: size * 0.48,
          height: size * 0.48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Emoji code={o.hero} size={size * 0.42} />
      </div>
      {/* orbiting badges */}
      {o.badges.slice(0, 3).map((code, i) => (
        <div
          key={code + i}
          style={{
            position: "absolute",
            left: badgePos[i].x,
            top: badgePos[i].y,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10,14,40,0.75)",
            border: `3px solid ${i === 1 ? t.b : t.a}`,
            boxShadow: `0 0 30px ${i === 1 ? t.b : t.a}`,
          }}
        >
          <Emoji code={code} size={badgeSize * 0.6} />
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- frame */

function Frame({ o, t, index, children }: { o: Opportunity; t: Theme; index: number; children: ReactNode }) {
  return (
    <div
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        color: WHITE,
        fontFamily: "Inter",
        backgroundColor: t.bg1,
      }}
    >
      <Background t={t} seed={o.id.length * 97 + index * 13} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "52px 60px 48px", position: "relative" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 66,
                height: 66,
                borderRadius: 66,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `4px solid ${t.a}`,
                boxShadow: `0 0 24px ${t.a}`,
                background: "rgba(0,0,0,0.4)",
                fontFamily: "Anton",
                fontSize: 30,
                color: t.a,
              }}
            >
              FT
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "Anton", fontSize: 32, letterSpacing: 2 }}>FUND IN TECH</div>
              <div style={{ fontSize: 17, color: MUTED, letterSpacing: 6 }}>TECH · EARN · GROW</div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 22px",
              borderRadius: 40,
              background: "rgba(255,255,255,0.1)",
              border: "2px solid rgba(255,255,255,0.18)",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            {`${index}/${SLIDES_PER_POST}`}
            {index < SLIDES_PER_POST ? <span style={{ color: t.b }}>SWIPE →</span> : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Pill({ children, bg, color, glow }: { children: ReactNode; bg: string; color: string; glow?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 24px",
        borderRadius: 14,
        background: bg,
        color,
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: 1,
        ...(glow ? { boxShadow: `0 0 28px ${glow}` } : {}),
      }}
    >
      {children}
    </div>
  );
}

function CommentBar({ t, compact = false }: { t: Theme; compact?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        flex: 1,
        padding: compact ? "18px 28px" : "22px 30px",
        borderRadius: 26,
        backgroundImage: `linear-gradient(90deg, ${t.a}, ${t.c})`,
        color: t.ink,
        boxShadow: `0 0 40px ${t.a}`,
      }}
    >
      <Emoji code="1f4ac" size={compact ? 58 : 70} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: compact ? 40 : 48, lineHeight: 1.1 }}>
          {`COMMENT "${COMMENT_KEYWORD}" FOR THE LINK`}
        </div>
        <div style={{ display: "flex", fontSize: compact ? 22 : 25, fontWeight: 800 }}>
          I&apos;ll reply with the official application link + tips
        </div>
      </div>
      <Emoji code="1f447" size={compact ? 52 : 62} />
    </div>
  );
}

function SectionTitle({ code, children, color }: { code: string; children: ReactNode; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
      <Emoji code={code} size={64} />
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: 66, color, textShadow: `0 0 26px ${color}` }}>
        {children}
      </div>
    </div>
  );
}

function titleSize(title: string) {
  if (title.length <= 18) return 116;
  if (title.length <= 26) return 100;
  if (title.length <= 34) return 86;
  return 76;
}

/* ----------------------------------------------------------------- slides */

function Cover({ o, t }: { o: Opportunity; t: Theme }) {
  return (
    <Frame o={o} t={t} index={1}>
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", height: 470 }}>
        <Hologram o={o} t={t} size={470} />
      </div>
      <div style={{ flexShrink: 0, display: "flex", gap: 14, marginTop: 4 }}>
        <Pill bg="#ff2d55" color={WHITE} glow="#ff2d55">
          <div style={{ width: 16, height: 16, borderRadius: 16, background: WHITE, display: "flex" }} />
          OPEN NOW
        </Pill>
        <Pill bg="rgba(255,255,255,0.12)" color={t.a}>
          {o.label}
        </Pill>
      </div>
      <div
        style={{
          flexShrink: 0, display: "flex",
          fontFamily: "Anton",
          fontSize: titleSize(o.title),
          lineHeight: 1.02,
          marginTop: 22,
          textTransform: "uppercase",
          textShadow: `0 0 30px ${t.a}`,
        }}
      >
        {o.title}
      </div>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-end", gap: 20, marginTop: 14 }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Anton",
            fontSize: o.highlight.length > 10 ? 84 : 104,
            lineHeight: 1,
            color: t.b,
            textShadow: `0 0 34px ${t.b}`,
          }}
        >
          {o.highlight}
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: WHITE, marginBottom: 10, maxWidth: 420 }}>
          {o.highlightLabel}
        </div>
      </div>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 14, marginTop: 18, fontSize: 30, fontWeight: 700 }}>
        <Emoji code="23f0" size={44} />
        <div style={{ display: "flex", color: MUTED }}>Deadline:</div>
        <div style={{ display: "flex", color: WHITE }}>{o.deadline}</div>
      </div>
      <div style={{ flexShrink: 0, display: "flex", marginTop: "auto" }}>
        <CommentBar t={t} compact />
      </div>
    </Frame>
  );
}

function Details({ o, t }: { o: Opportunity; t: Theme }) {
  return (
    <Frame o={o} t={t} index={2}>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", marginTop: 40 }}>
        <SectionTitle code="1f381" color={t.b}>
          WHAT YOU GET
        </SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {o.perks.slice(0, 4).map((p) => (
            <div
              key={p.t}
              style={{
                display: "flex",
                flexDirection: "column",
                width: 469,
                height: 210,
                padding: "24px 26px",
                borderRadius: 26,
                background: "rgba(255,255,255,0.07)",
                border: `2px solid ${t.a}`,
                boxShadow: `0 0 22px rgba(0,0,0,0.4)`,
              }}
            >
              <Emoji code={p.e} size={74} />
              <div style={{ display: "flex", fontSize: 31, fontWeight: 800, marginTop: 14, lineHeight: 1.2 }}>{p.t}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", marginTop: 44 }}>
        <SectionTitle code="1f3af" color={t.a}>
          WHO CAN APPLY?
        </SectionTitle>
        {o.eligibility.slice(0, 4).map((e) => (
          <div key={e} style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34, fontWeight: 700, marginBottom: 18 }}>
            <Emoji code="2705" size={44} />
            <div style={{ display: "flex", flex: 1 }}>{e}</div>
          </div>
        ))}
      </div>
      <div style={{ flexShrink: 0, display: "flex", marginTop: "auto" }}>
        <CommentBar t={t} compact />
      </div>
    </Frame>
  );
}

function HowTo({ o, t }: { o: Opportunity; t: Theme }) {
  return (
    <Frame o={o} t={t} index={3}>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", marginTop: 40 }}>
        <SectionTitle code="1f680" color={t.b}>
          HOW TO APPLY
        </SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: 37,
              top: 30,
              width: 4,
              height: 330,
              backgroundImage: `linear-gradient(${t.a}, ${t.c})`,
              display: "flex",
            }}
          />
          {o.steps.slice(0, 4).map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 26 }}>
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 78,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: t.bg1,
                  border: `4px solid ${t.a}`,
                  boxShadow: `0 0 22px ${t.a}`,
                  fontFamily: "Anton",
                  fontSize: 40,
                  color: t.a,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ display: "flex", flex: 1, fontSize: 35, fontWeight: 700, lineHeight: 1.2 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0, display: "flex",
          flexDirection: "column",
          gap: 14,
          marginTop: 10,
          padding: "26px 30px",
          borderRadius: 26,
          background: "rgba(255,255,255,0.08)",
          border: `2px solid ${t.b}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 800 }}>
          <Emoji code="23f0" size={44} />
          <div style={{ display: "flex", color: t.b }}>{o.deadline}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 700 }}>
          <Emoji code="1f4cc" size={44} />
          <div style={{ display: "flex" }}>{o.location}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 700 }}>
          <Emoji code="1f517" size={44} />
          <div style={{ display: "flex", color: t.a }}>{o.link}</div>
        </div>
      </div>
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", marginTop: 4, height: 250 }}>
        <Hologram o={o} t={t} size={250} />
      </div>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", marginTop: "auto", gap: 16 }}>
        <div style={{ display: "flex" }}>
          <CommentBar t={t} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 24, color: MUTED, fontWeight: 700 }}>
          Follow @fundntech for 2 new opportunities daily
        </div>
      </div>
    </Frame>
  );
}

/** Emoji codes a slide needs, so they can be loaded before rendering. */
function emojiFor(o: Opportunity) {
  return [
    o.hero,
    ...o.badges,
    ...o.perks.map((p) => p.e),
    "1f4ac",
    "1f447",
    "23f0",
    "2705",
    "1f381",
    "1f3af",
    "1f680",
    "1f4cc",
    "1f517",
  ];
}

export async function renderSlide(o: Opportunity, n: number) {
  await loadEmoji(emojiFor(o));
  const t = THEMES[o.kind];
  if (n === 1) return <Cover o={o} t={t} />;
  if (n === 2) return <Details o={o} t={t} />;
  return <HowTo o={o} t={t} />;
}
