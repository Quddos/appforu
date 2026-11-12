import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CSSProperties, ReactNode } from "react";
import type { Opportunity } from "./opportunities";
import { COMMENT_KEYWORD, daysLeft, nextUp, opportunities, SLIDES_PER_POST } from "./opportunities";

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

/* ------------------------------------------------------- 3D icons (Fluent) */

const iconCache = new Map<string, string>();

async function loadIcons(codes: string[]) {
  const dir = path.join(process.cwd(), "assets", "f3d");
  await Promise.all(
    codes
      .filter((c) => !iconCache.has(c))
      .map(async (c) => {
        try {
          const png = await readFile(path.join(dir, `${c}.png`));
          iconCache.set(c, `data:image/png;base64,${png.toString("base64")}`);
        } catch {
          iconCache.set(c, "");
        }
      }),
  );
}

function Icon({ code, size, style }: { code: string; size: number; style?: CSSProperties }) {
  const src = iconCache.get(code);
  if (!src) return <div style={{ display: "flex", width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="" style={style} />;
}

/* ------------------------------------------------------------------ theme */

type Theme = {
  dark: boolean;
  bg: string;
  bg2: string;
  text: string;
  sub: string;
  accent: string; // main brand colour of the palette (badges, step numbers, links)
  glow: string; // background glow
  hi: string; // highlight box / stars / headline accent on dark
  card: string;
  cardBorder: string;
  banner: string;
  soft: string; // icon circle fill
  panel: string; // "who can apply" panel
};

const YELLOW = "#FFD21F";
const RED = "#E8202A";
const WHITE = "#FFFFFF";
const INK = "#0B0F1A";

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function darkTheme(bg: string, bg2: string, accent: string, glow: string, hi = YELLOW, banner = "#020821"): Theme {
  return {
    dark: true, bg, bg2, text: WHITE, sub: "#D5DCF2", accent, glow, hi,
    card: "rgba(255,255,255,0.08)", cardBorder: rgba(accent, 0.5), banner,
    soft: rgba(accent, 0.25), panel: "rgba(255,255,255,0.07)",
  };
}

function lightTheme(bg: string, bg2: string, accent: string, banner: string, soft: string, hi = YELLOW): Theme {
  return {
    dark: false, bg, bg2, text: INK, sub: "#3B4766", accent, glow: "#FFFFFF", hi,
    card: WHITE, cardBorder: rgba(accent, 0.22), banner, soft, panel: rgba(accent, 0.08),
  };
}

/** Several palettes per kind; each post picks one from its id so the feed never looks repetitive. */
const PALETTES: Record<Opportunity["kind"], Theme[]> = {
  earn: [
    darkTheme("#050E2E", "#0D2A7A", "#4C8DFF", "#3D7BFF"), // midnight blue
    darkTheme("#03140E", "#075E3C", "#22C55E", "#10B981"), // money green
    darkTheme("#12062B", "#4C1D95", "#A855F7", "#8B5CF6", "#FDE047"), // electric purple
    darkTheme("#1A0508", "#7F1D1D", "#F43F5E", "#EF4444", "#FFD21F", "#140205"), // red hot
    darkTheme("#0B0B0B", "#262626", "#F59E0B", "#F59E0B", "#FACC15"), // black & gold
  ],
  academic: [
    lightTheme("#F3F7FF", "#DCE8FF", "#1E46E0", "#0A1A4F", "#E6EEFF"), // classic blue
    lightTheme("#FFF7ED", "#FFE4C7", "#EA580C", "#3B1A08", "#FFEDD5"), // sunset orange
    lightTheme("#ECFDF5", "#CCF5E3", "#047857", "#022C22", "#D1FAE5"), // fresh green
    lightTheme("#FAF5FF", "#EBDDFF", "#7C3AED", "#2E1065", "#EDE9FE"), // lavender
    lightTheme("#FFF1F2", "#FFD9DE", "#E11D48", "#4C0519", "#FFE4E6"), // rose
    lightTheme("#ECFEFF", "#CDF3F8", "#0E7490", "#083344", "#CFFAFE"), // ocean teal
  ],
};

export function themeFor(o: Opportunity): Theme {
  const list = PALETTES[o.kind];
  // Rotate through palettes in list order so consecutive posts of a kind never share colours.
  const sameKind = opportunities.filter((x) => x.kind === o.kind);
  const i = Math.max(0, sameKind.findIndex((x) => x.id === o.id));
  return list[i % list.length];
}

/* ------------------------------------------------------------- background */

function Background({ t, seed }: { t: Theme; seed: number }) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const sparkles = Array.from({ length: t.dark ? 40 : 18 }, () => ({
    x: rnd() * SLIDE_WIDTH,
    y: rnd() * SLIDE_HEIGHT,
    r: rnd() * 2.2 + 0.6,
    o: rnd() * 0.6 + 0.2,
  }));
  const dots: { x: number; y: number }[] = [];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) dots.push({ x: 860 + i * 22, y: 170 + j * 22 });

  return (
    <svg width={SLIDE_WIDTH} height={SLIDE_HEIGHT} style={{ position: "absolute", top: 0, left: 0 }}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={t.bg} />
          <stop offset="0.55" stopColor={t.bg2} />
          <stop offset="1" stopColor={t.bg} />
        </linearGradient>
        <radialGradient id="glow" cx="0.78" cy="0.3" r="0.45">
          <stop offset="0" stopColor={t.glow} stopOpacity={t.dark ? 0.55 : 0.9} />
          <stop offset="1" stopColor={t.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ray" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={WHITE} stopOpacity="0" />
          <stop offset="0.5" stopColor={WHITE} stopOpacity={t.dark ? 0.07 : 0.5} />
          <stop offset="1" stopColor={WHITE} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={SLIDE_WIDTH} height={SLIDE_HEIGHT} fill="url(#bg)" />
      <rect width={SLIDE_WIDTH} height={SLIDE_HEIGHT} fill="url(#glow)" />
      {/* diagonal light rays */}
      <polygon points="560,0 700,0 380,1440 240,1440" fill="url(#ray)" />
      <polygon points="820,0 880,0 600,1440 540,1440" fill="url(#ray)" />
      {/* dotted pattern */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="3" fill={t.accent} opacity={t.dark ? 0.4 : 0.18} />
      ))}
      {sparkles.map((p, i) => (
        <circle key={`s${i}`} cx={p.x} cy={p.y} r={p.r} fill={t.dark ? WHITE : t.accent} opacity={t.dark ? p.o : p.o * 0.3} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------ brand bits */

function Logo({ t }: { t: Theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          width: 78,
          height: 78,
          borderRadius: 78,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#04122B",
          border: "5px solid #18C6D8",
          fontFamily: "Anton",
          fontSize: 36,
          color: "#18C6D8",
        }}
      >
        FT
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 40, letterSpacing: 1, lineHeight: 1.05 }}>
          <span style={{ color: t.dark ? WHITE : t.banner }}>FUND</span>
          <span style={{ color: t.dark ? YELLOW : "#F29D00" }}>IN</span>
          <span style={{ color: t.dark ? WHITE : t.banner }}>TECH</span>
        </div>
        <div style={{ display: "flex", fontSize: 17, fontWeight: 800, letterSpacing: 3, color: t.sub }}>
          LEARN • EARN • GROW
        </div>
      </div>
    </div>
  );
}

function SwipeBadge({ index }: { index: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", borderRadius: 14, overflow: "hidden", border: `3px solid ${YELLOW}` }}>
      <div style={{ display: "flex", background: YELLOW, color: INK, fontFamily: "Anton", fontSize: 40, padding: "4px 16px" }}>
        {`${index}/${SLIDES_PER_POST}`}
      </div>
      <div style={{ display: "flex", background: INK, color: WHITE, fontFamily: "Anton", fontSize: 30, padding: "10px 16px" }}>
        {index < SLIDES_PER_POST ? "SWIPE LEFT »" : "FINAL STEP"}
      </div>
    </div>
  );
}

function Header({ t, index }: { t: Theme; index: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
      <Logo t={t} />
      <SwipeBadge index={index} />
    </div>
  );
}

function Stars({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", width: 120, height: 4, background: color }} />
      {[0, 1, 2].map((i) => (
        <svg key={i} width="30" height="30" viewBox="0 0 24 24">
          <polygon points="12,1.5 14.9,8.6 22.5,9.2 16.7,14.2 18.5,21.7 12,17.7 5.5,21.7 7.3,14.2 1.5,9.2 9.1,8.6" fill={color} />
        </svg>
      ))}
      <div style={{ display: "flex", width: 120, height: 4, background: color }} />
    </div>
  );
}

function CommentBanner({ t, o }: { t: Theme; o: Opportunity }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        flex: 1,
        padding: "18px 26px",
        borderRadius: 24,
        background: t.banner,
        border: `4px solid ${YELLOW}`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 96,
          background: YELLOW,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon code="1f4ac" size={70} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 46, color: WHITE, lineHeight: 1.05 }}>
          COMMENT&nbsp;<span style={{ color: YELLOW }}>{`"${COMMENT_KEYWORD}"`}</span>
        </div>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 32, color: YELLOW, lineHeight: 1.1 }}>
          {`& WE'LL SEND YOU THE ${o.kind === "earn" ? "SIGN-UP" : "APPLICATION"} LINK!`}
        </div>
      </div>
      <Icon code="1f447" size={74} />
    </div>
  );
}

function SectionHeading({ children, t, code }: { children: ReactNode; t: Theme; code?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {code ? <Icon code={code} size={70} /> : null}
      <div
        style={{
          display: "flex",
          background: t.dark ? t.hi : t.banner,
          color: t.dark ? INK : WHITE,
          fontFamily: "Anton",
          fontSize: 44,
          padding: "6px 26px 6px 22px",
          borderRadius: 10,
          letterSpacing: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Frame({ o, t, index, children }: { o: Opportunity; t: Theme; index: number; children: ReactNode }) {
  return (
    <div
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "Inter",
        color: t.text,
        backgroundColor: t.bg,
      }}
    >
      <Background t={t} seed={o.id.length * 131 + index * 17} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "44px 52px 44px", position: "relative" }}>
        <Header t={t} index={index} />
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ hero visual */

function HeroVisual({ o, t, size }: { o: Opportunity; t: Theme; size: number }) {
  const b = size * 0.3;
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      {/* glow disc */}
      <div
        style={{
          position: "absolute",
          left: size * 0.06,
          top: size * 0.06,
          width: size * 0.88,
          height: size * 0.88,
          borderRadius: size,
          backgroundImage: t.dark
            ? `radial-gradient(circle, ${rgba(t.glow, 0.65)}, ${rgba(t.accent, 0.25)} 55%, ${rgba(t.accent, 0)} 72%)`
            : `radial-gradient(circle, ${rgba(t.hi, 0.75)}, ${rgba(t.hi, 0.25)} 55%, ${rgba(t.hi, 0)} 72%)`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: size * 0.13,
          top: size * 0.13,
          width: size * 0.74,
          height: size * 0.74,
          borderRadius: size,
          border: `6px dashed ${t.dark ? rgba(t.hi, 0.75) : rgba(t.accent, 0.45)}`,
          display: "flex",
        }}
      />
      <Icon
        code={o.hero}
        size={size * 0.62}
        style={{ position: "absolute", left: size * 0.19, top: size * 0.17 }}
      />
      {o.badges.slice(0, 3).map((c, i) => {
        const pos = [
          { left: -size * 0.02, top: size * 0.62 },
          { left: size * 0.7, top: size * 0.02 },
          { left: size * 0.72, top: size * 0.66 },
        ][i];
        return (
          <div
            key={c + i}
            style={{
              position: "absolute",
              ...pos,
              width: b,
              height: b,
              borderRadius: b,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: WHITE,
              border: `5px solid ${i === 1 ? t.hi : t.accent}`,
              boxShadow: "0 12px 26px rgba(0,0,0,0.35)",
            }}
          >
            <Icon code={c} size={b * 0.68} />
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- slides */

function highlightSize(text: string) {
  if (text.length <= 8) return 128;
  if (text.length <= 10) return 108;
  if (text.length <= 12) return 92;
  return 78;
}

function Cover({ o, t }: { o: Opportunity; t: Theme }) {
  return (
    <Frame o={o} t={t} index={1}>
      {/* ribbon */}
      <div style={{ display: "flex", gap: 14, marginTop: 26, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: RED,
            color: WHITE,
            fontFamily: "Anton",
            fontSize: 34,
            padding: "6px 22px 6px 12px",
            borderRadius: 12,
            transform: "rotate(-2deg)",
          }}
        >
          <Icon code="1f6a8" size={46} />
          OPEN NOW
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: t.dark ? "rgba(255,255,255,0.12)" : WHITE,
            border: `3px solid ${t.accent}`,
            color: t.accent,
            fontFamily: "Anton",
            fontSize: 32,
            padding: "4px 20px",
            borderRadius: 12,
          }}
        >
          {o.label}
        </div>
      </div>

      {/* headline + hero */}
      <div style={{ display: "flex", marginTop: 18, flexShrink: 0, height: 560 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 590 }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 82, lineHeight: 1.02, color: t.text }}>{o.kicker}</div>
          <div style={{ display: "flex", marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                background: YELLOW,
                color: INK,
                fontFamily: "Anton",
                fontSize: highlightSize(o.highlight),
                lineHeight: 1.05,
                padding: "0 18px",
                transform: "rotate(-1.5deg)",
                boxShadow: "8px 8px 0 rgba(0,0,0,0.25)",
              }}
            >
              {o.highlight}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Anton",
              fontSize: 56,
              lineHeight: 1.05,
              color: t.dark ? WHITE : t.accent,
              marginTop: 16,
            }}
          >
            {o.highlightLabel}
          </div>
          <div style={{ display: "flex", marginTop: 14 }}>
            <Stars color={YELLOW} />
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, marginTop: 14, color: t.text, lineHeight: 1.2 }}>
            {o.title}
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, marginTop: 8, color: t.sub, lineHeight: 1.3, maxWidth: 520 }}>
            {o.subtitle}
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", alignItems: "center" }}>
          <HeroVisual o={o} t={t} size={400} />
        </div>
      </div>

      {/* perk tiles */}
      <div
        style={{
          display: "flex",
          marginTop: 22,
          flexShrink: 0,
          background: t.dark ? "rgba(255,255,255,0.07)" : WHITE,
          border: `2px solid ${t.cardBorder}`,
          borderRadius: 26,
          padding: "18px 10px",
          boxShadow: t.dark ? "none" : `0 10px 30px ${rgba(t.accent, 0.15)}`,
        }}
      >
        {o.perks.slice(0, 4).map((p, i) => (
          <div
            key={p.t}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 244,
              padding: "0 10px",
              borderLeft: i ? `2px solid ${t.cardBorder}` : "none",
            }}
          >
            <div
              style={{
                width: 112,
                height: 112,
                borderRadius: 112,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: t.soft,
                border: `4px solid ${t.accent}`,
              }}
            >
              <Icon code={p.e} size={80} />
            </div>
            <div
              style={{
                display: "flex",
                textAlign: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 800,
                marginTop: 12,
                lineHeight: 1.2,
                color: t.text,
              }}
            >
              {p.t}
            </div>
          </div>
        ))}
      </div>

      {/* deadline strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: YELLOW,
            color: INK,
            fontFamily: "Anton",
            fontSize: 32,
            padding: "6px 18px",
            borderRadius: 10,
          }}
        >
          <Icon code="23f0" size={40} />
          DEADLINE
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: t.text }}>{o.deadline}</div>
      </div>

      <div style={{ display: "flex", marginTop: 20, flexShrink: 0 }}>
        <CommentBanner t={t} o={o} />
      </div>
    </Frame>
  );
}

/* ---------------------------------------------------------------- photos */

const photoCache = new Map<string, string>();

async function loadPhoto(o: Opportunity) {
  if (!o.photo || photoCache.has(o.photo.file)) return;
  try {
    const buf = await readFile(path.join(process.cwd(), "assets", "photos", o.photo.file));
    photoCache.set(o.photo.file, `data:image/jpeg;base64,${buf.toString("base64")}`);
  } catch {
    photoCache.set(o.photo.file, "");
  }
}

function photoSrc(o: Opportunity) {
  return o.photo ? photoCache.get(o.photo.file) || "" : "";
}

function PhotoPanel({ o, width, height, radius = 28, t }: { o: Opportunity; width: number; height: number; radius?: number; t: Theme }) {
  const src = photoSrc(o);
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        border: `5px solid ${t.hi}`,
        boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={width} height={height} alt="" style={{ objectFit: "cover", width, height }} />
      <div
        style={{
          position: "absolute",
          right: 10,
          bottom: 8,
          display: "flex",
          fontSize: 14,
          color: WHITE,
          background: "rgba(0,0,0,0.45)",
          padding: "3px 8px",
          borderRadius: 6,
        }}
      >
        {o.photo?.credit}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- countdown */

function countdownText(o: Opportunity) {
  const d = daysLeft(o);
  if (o.deadlineVaries || d > 120) return { top: "OPEN", mid: "NOW", bottom: "APPLY" };
  if (d === 0) return { top: "LAST", mid: "DAY", bottom: "HURRY!" };
  return { top: "CLOSES IN", mid: String(d), bottom: d === 1 ? "DAY" : "DAYS" };
}

function CountdownStamp({ o, size = 190, style }: { o: Opportunity; size?: number; style?: CSSProperties }) {
  const c = countdownText(o);
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size,
        background: RED,
        border: `6px solid ${WHITE}`,
        boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: WHITE,
        transform: "rotate(12deg)",
        ...style,
      }}
    >
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: size * 0.14, lineHeight: 1 }}>{c.top}</div>
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: size * 0.36, lineHeight: 1, color: YELLOW }}>{c.mid}</div>
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: size * 0.14, lineHeight: 1 }}>{c.bottom}</div>
    </div>
  );
}

/* ---------------------------------------------------------- shared blocks */

function Ribbon({ o, t }: { o: Opportunity; t: Theme }) {
  return (
    <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: RED,
          color: WHITE,
          fontFamily: "Anton",
          fontSize: 34,
          padding: "6px 22px 6px 12px",
          borderRadius: 12,
          transform: "rotate(-2deg)",
        }}
      >
        <Icon code="1f6a8" size={46} />
        OPEN NOW
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: t.dark ? "rgba(255,255,255,0.12)" : WHITE,
          border: `3px solid ${t.accent}`,
          color: t.dark ? WHITE : t.accent,
          fontFamily: "Anton",
          fontSize: 32,
          padding: "4px 20px",
          borderRadius: 12,
        }}
      >
        {o.label}
      </div>
    </div>
  );
}

function HighlightBox({ o, t, size, center = false }: { o: Opportunity; t: Theme; size?: number; center?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: center ? "center" : "flex-start" }}>
      <div
        style={{
          display: "flex",
          background: t.hi,
          color: INK,
          fontFamily: "Anton",
          fontSize: size ?? highlightSize(o.highlight),
          lineHeight: 1.05,
          padding: "0 20px",
          transform: "rotate(-1.5deg)",
          boxShadow: "8px 8px 0 rgba(0,0,0,0.25)",
        }}
      >
        {o.highlight}
      </div>
    </div>
  );
}

function PerkStrip({ o, t }: { o: Opportunity; t: Theme }) {
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        background: t.dark ? "rgba(255,255,255,0.07)" : WHITE,
        border: `2px solid ${t.cardBorder}`,
        borderRadius: 26,
        padding: "18px 10px",
        boxShadow: t.dark ? "none" : `0 10px 30px ${rgba(t.accent, 0.15)}`,
      }}
    >
      {o.perks.slice(0, 4).map((p, i) => (
        <div
          key={p.t}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 244,
            padding: "0 10px",
            borderLeft: i ? `2px solid ${t.cardBorder}` : "none",
          }}
        >
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 104,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: t.soft,
              border: `4px solid ${t.accent}`,
            }}
          >
            <Icon code={p.e} size={74} />
          </div>
          <div style={{ display: "flex", textAlign: "center", justifyContent: "center", fontSize: 23, fontWeight: 800, marginTop: 10, lineHeight: 1.2, color: t.text }}>
            {p.t}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------- cover layout: photo top */

function CoverPhoto({ o, t }: { o: Opportunity; t: Theme }) {
  return (
    <Frame o={o} t={t} index={1}>
      <div style={{ display: "flex", position: "relative", marginTop: 14, flexShrink: 0, height: 470 }}>
        <PhotoPanel o={o} t={t} width={976} height={455} />
        <div style={{ position: "absolute", left: 22, top: 22, display: "flex" }}>
          <Ribbon o={o} t={t} />
        </div>
        <CountdownStamp o={o} size={200} style={{ right: -14, bottom: -14 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, marginTop: 6 }}>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 76, lineHeight: 1.02, color: t.text }}>{o.kicker}</div>
        <div style={{ display: "flex", marginTop: 6 }}>
          <HighlightBox o={o} t={t} />
        </div>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 50, lineHeight: 1.05, color: t.dark ? WHITE : t.accent, marginTop: 12 }}>
          {o.highlightLabel}
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, marginTop: 10, color: t.sub }}>{o.title}</div>
      </div>
      <div style={{ display: "flex", flexShrink: 0, marginTop: 14 }}>
        <PerkStrip o={o} t={t} />
      </div>
      <div style={{ display: "flex", flexShrink: 0, marginTop: 14 }}>
        <CommentBanner t={t} o={o} />
      </div>
    </Frame>
  );
}

/* ---------------------------------------------------- cover layout: poster */

function CoverPoster({ o, t }: { o: Opportunity; t: Theme }) {
  const hasPhoto = !!photoSrc(o);
  return (
    <Frame o={o} t={t} index={1}>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 16, flexShrink: 0 }}>
        <Ribbon o={o} t={t} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, marginTop: 10 }}>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 88, lineHeight: 1, color: t.text, textAlign: "center" }}>
          {o.kicker}
        </div>
        <div style={{ display: "flex", marginTop: 10 }}>
          <HighlightBox o={o} t={t} size={Math.min(150, highlightSize(o.highlight) * 1.25)} center />
        </div>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 54, color: t.dark ? WHITE : t.accent, marginTop: 14, textAlign: "center" }}>
          {o.highlightLabel}
        </div>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: t.sub, marginTop: 6 }}>{o.title}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", flexShrink: 0, height: 400, marginTop: 8 }}>
        {hasPhoto ? <PhotoPanel o={o} t={t} width={680} height={380} radius={40} /> : <HeroVisual o={o} t={t} size={390} />}
        <CountdownStamp o={o} size={180} style={{ right: 10, top: 0 }} />
      </div>
      <div style={{ display: "flex", flexShrink: 0, marginTop: 10 }}>
        <PerkStrip o={o} t={t} />
      </div>
      <div style={{ display: "flex", flexShrink: 0, marginTop: 14 }}>
        <CommentBanner t={t} o={o} />
      </div>
    </Frame>
  );
}

/* --------------------------------------------------- slide 2: covered */

function Covered({ o, t }: { o: Opportunity; t: Theme }) {
  const hasPhoto = !!photoSrc(o);
  return (
    <Frame o={o} t={t} index={2}>
      <div style={{ display: "flex", alignItems: "center", marginTop: 20, flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 92, lineHeight: 1, color: t.text }}>
            WHAT YOU&nbsp;<span style={{ color: t.dark ? t.hi : t.accent }}>GET</span>
          </div>
          <div style={{ display: "flex", marginTop: 12 }}>
            <Stars color={t.dark ? t.hi : t.accent} />
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, marginTop: 10, color: t.sub }}>{o.title}</div>
        </div>
        <HeroVisual o={o} t={t} size={230} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 18, flexShrink: 0 }}>
        {o.perks.slice(0, 4).map((p, i) => (
          <div
            key={p.t}
            style={{
              display: "flex",
              flexDirection: "column",
              width: 479,
              height: 250,
              padding: "22px 24px",
              borderRadius: 26,
              background: i === 0 ? t.accent : t.card,
              border: `2px solid ${i === 0 ? t.accent : t.cardBorder}`,
              boxShadow: t.dark ? "none" : `0 8px 22px ${rgba(t.accent, 0.12)}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Icon code={p.e} size={100} />
              <div style={{ display: "flex", fontFamily: "Anton", fontSize: 54, color: i === 0 ? WHITE : rgba(t.accent, 0.35) }}>{`0${i + 1}`}</div>
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginTop: 14, color: i === 0 ? WHITE : t.text }}>{p.t}</div>
          </div>
        ))}
      </div>
      {hasPhoto ? (
        <div style={{ display: "flex", flexShrink: 0, marginTop: 18 }}>
          <PhotoPanel o={o} t={t} width={976} height={230} />
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 18,
          flexShrink: 0,
          padding: "18px 26px",
          borderRadius: 22,
          background: t.banner,
          border: `3px solid ${YELLOW}`,
        }}
      >
        <div style={{ width: 90, height: 90, borderRadius: 90, background: YELLOW, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon code="1f3c6" size={66} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 40, color: WHITE }}>SEE IF YOU QUALIFY</div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 32, color: YELLOW }}>SWIPE FOR THE CHECKLIST »</div>
        </div>
      </div>
    </Frame>
  );
}

/* ---------------------------------------------- slide 3: is this you? */

function Eligibility({ o, t }: { o: Opportunity; t: Theme }) {
  const d = daysLeft(o);
  const c = countdownText(o);
  return (
    <Frame o={o} t={t} index={3}>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 20, flexShrink: 0 }}>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 48, color: t.dark ? t.hi : t.accent }}>QUICK CHECK</div>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 104, lineHeight: 1, color: t.text }}>IS THIS YOU?</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20, flexShrink: 0 }}>
        {o.eligibility.slice(0, 4).map((e) => (
          <div
            key={e}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "20px 24px",
              borderRadius: 22,
              background: t.card,
              border: `2px solid ${t.cardBorder}`,
              boxShadow: t.dark ? "none" : `0 8px 22px ${rgba(t.accent, 0.12)}`,
            }}
          >
            <Icon code="2705" size={58} />
            <div style={{ display: "flex", flex: 1, fontSize: 34, fontWeight: 800, color: t.text, lineHeight: 1.2 }}>{e}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 22, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 300,
            height: 250,
            borderRadius: 26,
            background: RED,
            color: WHITE,
          }}
        >
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 34 }}>{c.top}</div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 110, lineHeight: 1, color: YELLOW }}>{c.mid}</div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 34 }}>{c.bottom}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            height: 250,
            padding: "0 28px",
            borderRadius: 26,
            background: t.panel,
            border: `2px solid ${t.cardBorder}`,
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 800, color: t.text }}>
            <Icon code="23f0" size={44} />
            {o.deadline}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 800, color: t.text }}>
            <Icon code="1f4cc" size={44} />
            {o.location}
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: t.sub }}>
            {d <= 30 ? "Start today. Strong applications take time!" : "Start early. Strong applications take time!"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexShrink: 0, marginTop: 20 }}>
        <CommentBanner t={t} o={o} />
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------ slide 4: how to */

const STEP_ICONS = ["1f50e", "1f4dd", "1f4e9", "1f680"];

function HowTo({ o, t }: { o: Opportunity; t: Theme }) {
  return (
    <Frame o={o} t={t} index={4}>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 20, flexShrink: 0 }}>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 50, color: t.dark ? t.hi : t.accent }}>STEP-BY-STEP GUIDE</div>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 96, lineHeight: 1, color: t.text }}>HOW TO APPLY</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18, flexShrink: 0 }}>
        {o.steps.slice(0, 4).map((s, i) => (
          <div
            key={s}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              height: 132,
              padding: "0 22px 0 0",
              borderRadius: 22,
              overflow: "hidden",
              background: t.card,
              border: `2px solid ${t.cardBorder}`,
              boxShadow: t.dark ? "none" : `0 8px 22px ${rgba(t.accent, 0.12)}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 112,
                height: 132,
                background: t.accent,
                color: WHITE,
                fontFamily: "Anton",
                fontSize: 66,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <Icon code={STEP_ICONS[i]} size={80} />
            <div style={{ display: "flex", flex: 1, fontSize: 32, fontWeight: 800, lineHeight: 1.2, color: t.text }}>{s}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 18,
          flexShrink: 0,
          padding: "20px 24px",
          borderRadius: 22,
          background: t.dark ? "rgba(255,255,255,0.08)" : WHITE,
          border: `3px dashed ${t.accent}`,
        }}
      >
        <Icon code="1f4bb" size={96} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 34, color: t.text }}>OFFICIAL WEBSITE</div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: t.accent }}>{o.link}</div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: t.sub, marginTop: 4 }}>
            Always apply on the official site. Never pay an agent!
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexShrink: 0, marginTop: 18 }}>
        <CommentBanner t={t} o={o} />
      </div>
    </Frame>
  );
}

/* ------------------------------------------- slide 5: save + next up */

function Final({ o, t }: { o: Opportunity; t: Theme }) {
  const next = nextUp(o);
  return (
    <Frame o={o} t={t} index={5}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 112, lineHeight: 1, color: t.text }}>DON&apos;T LOSE IT!</div>
        <div style={{ display: "flex", marginTop: 12 }}>
          <Stars color={t.dark ? t.hi : t.accent} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 20, flexShrink: 0 }}>
        {[
          { e: "1f4cc", h: "SAVE THIS", s: "Find it again before the deadline" },
          { e: "1f4e8", h: "SEND IT", s: "Tag a friend who needs this" },
        ].map((b) => (
          <div
            key={b.h}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              padding: "24px 18px",
              borderRadius: 26,
              background: t.card,
              border: `3px solid ${t.accent}`,
            }}
          >
            <Icon code={b.e} size={110} />
            <div style={{ display: "flex", fontFamily: "Anton", fontSize: 54, color: t.text, marginTop: 8 }}>{b.h}</div>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: t.sub, textAlign: "center" }}>{b.s}</div>
          </div>
        ))}
      </div>
      {next ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 22,
            flexShrink: 0,
            padding: "24px 28px",
            borderRadius: 26,
            background: t.banner,
            border: `4px solid ${YELLOW}`,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Icon code="1f440" size={60} />
            <div style={{ display: "flex", fontFamily: "Anton", fontSize: 46, color: YELLOW }}>{`COMING ${next.when}`}</div>
          </div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 40, color: WHITE, marginTop: 10 }}>{next.post.kicker}</div>
          <div style={{ display: "flex", marginTop: 6 }}>
            <div style={{ display: "flex", background: YELLOW, color: INK, fontFamily: "Anton", fontSize: 72, padding: "0 16px", lineHeight: 1.1 }}>
              {next.post.highlight}
            </div>
          </div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 34, color: WHITE, marginTop: 10 }}>{next.post.highlightLabel}</div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: "#C9D6FF", marginTop: 10 }}>
            Follow so you don&apos;t miss it!
          </div>
          <Icon code={next.post.hero} size={170} style={{ position: "absolute", right: 24, top: 40 }} />
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginTop: 22,
          flexShrink: 0,
          padding: "20px 26px",
          borderRadius: 24,
          background: t.panel,
          border: `2px dashed ${t.accent}`,
        }}
      >
        <Icon code="1f517" size={70} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 40, color: t.text }}>ALL LINKS IN ONE PLACE</div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: t.accent }}>Tap the link in our bio</div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
          marginTop: 22,
          flexShrink: 0,
          background: RED,
          color: WHITE,
          fontFamily: "Anton",
          fontSize: 46,
          padding: "16px 0",
          borderRadius: 60,
        }}
      >
        <Icon code="1f514" size={52} />
        FOLLOW @FUNDNTECH
      </div>
    </Frame>
  );
}

/* --------------------------------------------------------------- render */

function iconsFor(o: Opportunity) {
  const next = nextUp(o);
  return [
    o.hero, ...o.badges, ...o.perks.map((p) => p.e), ...STEP_ICONS,
    "1f4ac", "1f447", "23f0", "2705", "1f3af", "1f3c6", "1f6a8", "1f4bb", "1f514", "1f4cc", "1f517", "1f4e8", "1f440",
    ...(next ? [next.post.hero] : []),
  ];
}

/** Cover layout rotates per post: split → photo-top (or poster) → poster. */
function coverFor(o: Opportunity, t: Theme) {
  const i = Math.max(0, opportunities.findIndex((x) => x.id === o.id));
  const layout = i % 3;
  if (layout === 1 && photoSrc(o)) return <CoverPhoto o={o} t={t} />;
  if (layout === 0) return <Cover o={o} t={t} />;
  return <CoverPoster o={o} t={t} />;
}

export async function renderSlide(o: Opportunity, n: number) {
  await Promise.all([loadIcons(iconsFor(o)), loadPhoto(o)]);
  const t = themeFor(o);
  if (n === 1) return coverFor(o, t);
  if (n === 2) return <Covered o={o} t={t} />;
  if (n === 3) return <Eligibility o={o} t={t} />;
  if (n === 4) return <HowTo o={o} t={t} />;
  return <Final o={o} t={t} />;
}
