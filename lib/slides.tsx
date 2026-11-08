import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";
import type { Opportunity } from "./opportunities";
import { SLIDES_PER_POST } from "./opportunities";

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1440; // 3:4 portrait, matches TikTok photo posts

const C = {
  bg1: "#050b1f",
  bg2: "#0b1d4a",
  teal: "#19d3c5",
  green: "#3dff8a",
  yellow: "#ffd400",
  white: "#ffffff",
  muted: "#a9b8e0",
  card: "rgba(255,255,255,0.07)",
  cardBorder: "rgba(25,211,197,0.45)",
};

let fontCache: Promise<{ name: string; data: Buffer; weight: 400 | 700 | 800 }[]> | null = null;

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
      { name: "Anton", data: anton, weight: 400 as const },
      { name: "Inter", data: i4, weight: 400 as const },
      { name: "Inter", data: i7, weight: 700 as const },
      { name: "Inter", data: i8, weight: 800 as const },
    ]);
  }
  return fontCache;
}

function Frame({ index, children, center = false }: { index: number; children: ReactNode; center?: boolean }) {
  return (
    <div
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundImage: `linear-gradient(160deg, ${C.bg1} 0%, ${C.bg2} 55%, #062a3a 100%)`,
        color: C.white,
        fontFamily: "Inter",
        padding: "56px 64px",
        position: "relative",
      }}
    >
      {/* glow accents */}
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: 600,
          backgroundImage: `radial-gradient(circle, rgba(25,211,197,0.35), rgba(25,211,197,0) 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -250,
          left: -150,
          width: 650,
          height: 650,
          borderRadius: 650,
          backgroundImage: `radial-gradient(circle, rgba(61,255,138,0.18), rgba(61,255,138,0) 70%)`,
        }}
      />

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 64,
              border: `4px solid ${C.teal}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Anton",
              fontSize: 30,
              color: C.teal,
            }}
          >
            FT
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Anton", fontSize: 30, letterSpacing: 2 }}>FUND IN TECH</div>
            <div style={{ fontSize: 16, color: C.muted, letterSpacing: 6 }}>LEARN · EARN · GROW</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            borderRadius: 40,
            background: "rgba(255,255,255,0.12)",
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          {`${index}/${SLIDES_PER_POST}`}
          {index < SLIDES_PER_POST ? <span style={{ color: C.yellow }}>SWIPE LEFT →</span> : null}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 40, justifyContent: center ? "center" : "flex-start" }}>
        {children}
      </div>

      {/* footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `2px solid rgba(255,255,255,0.15)`,
          paddingTop: 22,
          fontSize: 24,
          color: C.muted,
        }}
      >
        <div style={{ display: "flex" }}>@fundntech</div>
        <div style={{ display: "flex", color: C.green, fontWeight: 800 }}>FOLLOW FOR DAILY OPPORTUNITIES</div>
      </div>
    </div>
  );
}

function Pill({ children, color = C.yellow, text = "#0a0a0a" }: { children: ReactNode; color?: string; text?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        background: color,
        color: text,
        fontWeight: 800,
        fontSize: 28,
        padding: "10px 24px",
        borderRadius: 12,
        letterSpacing: 1,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, color = C.yellow }: { children: ReactNode; color?: string }) {
  return (
    <div style={{ display: "flex", fontFamily: "Anton", fontSize: 64, color, lineHeight: 1.1, marginBottom: 24 }}>
      {children}
    </div>
  );
}

function Bullet({ children, color = C.green }: { children: ReactNode; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 38, fontWeight: 700, marginBottom: 26 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 40,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 12,
            height: 22,
            borderRight: "5px solid #04122b",
            borderBottom: "5px solid #04122b",
            transform: "rotate(45deg) translate(-2px, -3px)",
          }}
        />
      </div>
      <div style={{ display: "flex", flex: 1 }}>{children}</div>
    </div>
  );
}

function titleSize(title: string) {
  if (title.length <= 18) return 150;
  if (title.length <= 28) return 124;
  if (title.length <= 40) return 104;
  return 88;
}

function Cover({ o }: { o: Opportunity }) {
  return (
    <Frame index={1}>
      <Pill>{o.kicker}</Pill>
      <div
        style={{
          display: "flex",
          fontFamily: "Anton",
          fontSize: titleSize(o.title),
          lineHeight: 1.02,
          marginTop: 28,
          textTransform: "uppercase",
        }}
      >
        {o.title}
      </div>
      <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: C.teal, marginTop: 20 }}>{o.subtitle}</div>
      <div style={{ display: "flex", gap: 16, marginTop: 28 }}>
        <Pill color="rgba(255,255,255,0.14)" text={C.white}>{o.country}</Pill>
        <Pill color={C.green}>{o.category.toUpperCase()}</Pill>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 56 }}>
        {o.benefits.slice(0, 4).map((b) => (
          <div
            key={b}
            style={{
              display: "flex",
              alignItems: "center",
              width: 464,
              minHeight: 120,
              padding: "20px 26px",
              borderRadius: 22,
              background: C.card,
              border: `2px solid ${C.cardBorder}`,
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {b}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "auto",
          marginBottom: 32,
          padding: "22px",
          borderRadius: 22,
          background: C.yellow,
          color: "#0a0a0a",
          fontFamily: "Anton",
          fontSize: 48,
          letterSpacing: 1,
        }}
      >
        SAVE THIS POST • SWIPE FOR DETAILS
      </div>
    </Frame>
  );
}

function Details({ o }: { o: Opportunity }) {
  return (
    <Frame index={2} center>
      <SectionTitle>WHO CAN APPLY?</SectionTitle>
      {o.eligibility.slice(0, 5).map((e) => (
        <Bullet key={e}>{e}</Bullet>
      ))}
      <div style={{ display: "flex", height: 60 }} />
      <SectionTitle color={C.teal}>WHAT YOU GET</SectionTitle>
      {o.benefits.slice(0, 5).map((b) => (
        <Bullet key={b} color={C.yellow}>
          {b}
        </Bullet>
      ))}
    </Frame>
  );
}

function HowTo({ o }: { o: Opportunity }) {
  return (
    <Frame index={3}>
      <SectionTitle>HOW TO APPLY</SectionTitle>
      {o.steps.slice(0, 4).map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 26 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              background: C.teal,
              color: "#04122b",
              fontFamily: "Anton",
              fontSize: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ display: "flex", flex: 1, fontSize: 36, fontWeight: 700 }}>{s}</div>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 16,
          padding: "26px 30px",
          borderRadius: 22,
          border: `3px solid ${C.yellow}`,
          background: "rgba(255,212,0,0.08)",
        }}
      >
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 40, color: C.yellow }}>DEADLINE</div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, marginTop: 8 }}>{o.deadline}</div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
          marginBottom: 28,
          padding: "26px 30px",
          borderRadius: 22,
          background: C.green,
          color: "#04122b",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, fontWeight: 800 }}>OFFICIAL LINK (IN CAPTION)</div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, marginTop: 6 }}>{o.link}</div>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, marginTop: 10 }}>
          Never pay an agent to apply. Save this & share it!
        </div>
      </div>
    </Frame>
  );
}

export function renderSlide(o: Opportunity, n: number) {
  if (n === 1) return <Cover o={o} />;
  if (n === 2) return <Details o={o} />;
  return <HowTo o={o} />;
}
