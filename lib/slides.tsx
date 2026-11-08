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
  accent: string; // blue
  card: string;
  cardBorder: string;
  banner: string;
};

const YELLOW = "#FFD21F";
const RED = "#E8202A";
const NAVY = "#0A1A4F";
const BLUE = "#1E46E0";
const WHITE = "#FFFFFF";
const INK = "#0B0F1A";

const THEMES: Record<Opportunity["kind"], Theme> = {
  earn: {
    dark: true,
    bg: "#050E2E",
    bg2: "#0D2A7A",
    text: WHITE,
    sub: "#C9D6FF",
    accent: "#4C8DFF",
    card: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(120,170,255,0.45)",
    banner: "#020821",
  },
  academic: {
    dark: false,
    bg: "#F3F7FF",
    bg2: "#DCE8FF",
    text: INK,
    sub: "#3B4766",
    accent: BLUE,
    card: WHITE,
    cardBorder: "#D5E0FA",
    banner: NAVY,
  },
};

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
          <stop offset="0" stopColor={t.dark ? "#3D7BFF" : "#FFFFFF"} stopOpacity={t.dark ? 0.55 : 0.9} />
          <stop offset="1" stopColor={t.dark ? "#3D7BFF" : "#FFFFFF"} stopOpacity="0" />
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
        <circle key={i} cx={d.x} cy={d.y} r="3" fill={t.dark ? "#7FA6FF" : BLUE} opacity={t.dark ? 0.35 : 0.18} />
      ))}
      {sparkles.map((p, i) => (
        <circle key={`s${i}`} cx={p.x} cy={p.y} r={p.r} fill={t.dark ? WHITE : BLUE} opacity={t.dark ? p.o : p.o * 0.3} />
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
          <span style={{ color: t.dark ? WHITE : NAVY }}>FUND</span>
          <span style={{ color: t.dark ? YELLOW : "#F29D00" }}>IN</span>
          <span style={{ color: t.dark ? WHITE : NAVY }}>TECH</span>
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
          background: t.dark ? YELLOW : NAVY,
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
            ? "radial-gradient(circle, rgba(90,150,255,0.65), rgba(30,70,224,0.25) 55%, rgba(30,70,224,0) 72%)"
            : "radial-gradient(circle, rgba(255,210,31,0.75), rgba(255,210,31,0.25) 55%, rgba(255,210,31,0) 72%)",
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
          border: `6px dashed ${t.dark ? "rgba(255,210,31,0.75)" : "rgba(30,70,224,0.45)"}`,
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
              border: `5px solid ${i === 1 ? YELLOW : BLUE}`,
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
              color: t.dark ? WHITE : BLUE,
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
          boxShadow: t.dark ? "none" : "0 10px 30px rgba(30,70,224,0.15)",
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
                background: t.dark ? "rgba(76,141,255,0.25)" : "#E6EEFF",
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

function Details({ o, t }: { o: Opportunity; t: Theme }) {
  return (
    <Frame o={o} t={t} index={2}>
      <div style={{ display: "flex", alignItems: "center", marginTop: 26, flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 88, lineHeight: 1, color: t.text }}>
            WHAT&apos;S&nbsp;<span style={{ color: t.dark ? YELLOW : BLUE }}>COVERED?</span>
          </div>
          <div style={{ display: "flex", marginTop: 12 }}>
            <Stars color={t.dark ? YELLOW : BLUE} />
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, marginTop: 10, color: t.sub }}>{o.title}</div>
        </div>
        <HeroVisual o={o} t={t} size={230} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 22, flexShrink: 0 }}>
        {o.perks.slice(0, 4).map((p) => (
          <div
            key={p.t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              width: 479,
              height: 150,
              padding: "16px 20px",
              borderRadius: 22,
              background: t.card,
              border: `2px solid ${t.cardBorder}`,
              boxShadow: t.dark ? "none" : "0 8px 22px rgba(30,70,224,0.12)",
            }}
          >
            <div
              style={{
                width: 106,
                height: 106,
                borderRadius: 106,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: t.dark ? "rgba(76,141,255,0.25)" : "#E6EEFF",
                flexShrink: 0,
              }}
            >
              <Icon code={p.e} size={78} />
            </div>
            <div style={{ display: "flex", flex: 1, fontSize: 29, fontWeight: 800, lineHeight: 1.2, color: t.text }}>
              {p.t}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 26,
          flexShrink: 0,
          padding: "22px 26px",
          borderRadius: 24,
          background: t.dark ? "rgba(255,255,255,0.07)" : "#EAF1FF",
          border: `2px solid ${t.cardBorder}`,
        }}
      >
        <SectionHeading t={t} code="1f3af">
          WHO CAN APPLY?
        </SectionHeading>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 16 }}>
          {o.eligibility.slice(0, 4).map((e) => (
            <div key={e} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <Icon code="2705" size={42} />
              <div style={{ display: "flex", flex: 1, fontSize: 30, fontWeight: 700, color: t.text }}>{e}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 20,
          flexShrink: 0,
          padding: "18px 26px",
          borderRadius: 22,
          background: t.banner,
          border: `3px solid ${YELLOW}`,
        }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: 90,
            background: YELLOW,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon code="1f3c6" size={66} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 40, color: WHITE }}>DON&apos;T MISS THIS ONE!</div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 32, color: YELLOW }}>{`DEADLINE: ${o.deadline.toUpperCase()}`}</div>
        </div>
        <div
          style={{
            display: "flex",
            background: WHITE,
            color: BLUE,
            fontFamily: "Anton",
            fontSize: 30,
            padding: "10px 18px",
            borderRadius: 40,
          }}
        >
          SWIPE »
        </div>
      </div>
    </Frame>
  );
}

const STEP_ICONS = ["1f50e", "1f4dd", "1f4e9", "1f680"];

function HowTo({ o, t }: { o: Opportunity; t: Theme }) {
  return (
    <Frame o={o} t={t} index={3}>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 26, flexShrink: 0 }}>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 50, color: t.dark ? YELLOW : BLUE }}>STEP-BY-STEP GUIDE</div>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 92, lineHeight: 1, color: t.text }}>HOW TO APPLY</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20, flexShrink: 0 }}>
        {o.steps.slice(0, 4).map((s, i) => (
          <div
            key={s}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              height: 128,
              padding: "0 22px 0 0",
              borderRadius: 22,
              overflow: "hidden",
              background: t.card,
              border: `2px solid ${t.cardBorder}`,
              boxShadow: t.dark ? "none" : "0 8px 22px rgba(30,70,224,0.12)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 110,
                height: 128,
                background: BLUE,
                color: WHITE,
                fontFamily: "Anton",
                fontSize: 64,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <Icon code={STEP_ICONS[i]} size={78} />
            <div style={{ display: "flex", flex: 1, fontSize: 32, fontWeight: 800, lineHeight: 1.2, color: t.text }}>{s}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 20,
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

      <div style={{ display: "flex", marginTop: 20, flexShrink: 0 }}>
        <CommentBanner t={t} o={o} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          marginTop: 14,
          flexShrink: 0,
          fontFamily: "Anton",
          fontSize: 30,
          color: t.text,
        }}
      >
        <Icon code="1f514" size={40} />
        FOLLOW @FUNDNTECH FOR 2 NEW OPPORTUNITIES DAILY
      </div>
    </Frame>
  );
}

function iconsFor(o: Opportunity) {
  return [o.hero, ...o.badges, ...o.perks.map((p) => p.e), ...STEP_ICONS, "1f4ac", "1f447", "23f0", "2705", "1f3af", "1f3c6", "1f6a8", "1f4bb", "1f514"];
}

export async function renderSlide(o: Opportunity, n: number) {
  await loadIcons(iconsFor(o));
  const t = THEMES[o.kind];
  if (n === 1) return <Cover o={o} t={t} />;
  if (n === 2) return <Details o={o} t={t} />;
  return <HowTo o={o} t={t} />;
}
