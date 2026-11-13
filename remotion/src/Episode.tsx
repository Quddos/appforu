import { ThreeCanvas } from "@remotion/three";
import { useEffect, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Character, type Mood, type Pose } from "./Character";
import type { EpisodeProps, TimedScene } from "./types";
import { Backdrop, CameraRig, Confetti, Lights, Particles, Sprite, Stage, usePreloadedTextures } from "./World";

const C = { ink: "#0E0726", grape: "#5B21B6", pink: "#FF2E88", butter: "#FFD23F", mint: "#21E6C1", white: "#FFFFFF" };
const SERIES = {
  brain: { bg: ["#04131F", "#0B6E63"], accent: C.pink, floor: "#0E9F8B", tag: "ONLY 1% CAN SOLVE THIS" },
  comic: { bg: ["#22053A", "#B0145F"], accent: C.butter, floor: "#7C1D6F", tag: "KERNEL'S SIDE HUSTLE SAGA" },
  watch: { bg: ["#070D2B", "#3B1C8F"], accent: C.mint, floor: "#3B1C8F", tag: "WHAT TO WATCH TONIGHT" },
} as const;

const fontCss = `
@font-face { font-family: Anton; src: url(${staticFile("fonts/anton-latin-400-normal.woff")}) format("woff"); }
@font-face { font-family: Inter; font-weight: 800; src: url(${staticFile("fonts/inter-latin-800-normal.woff")}) format("woff"); }
`;

function useFonts() {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all([document.fonts.load("100px Anton"), document.fonts.load("800 40px Inter")]).finally(() => continueRender(h));
  }, [h]);
}

const icon = (code: string) => staticFile(`icons/${code}.png`);

/* ------------------------------------------------- per-scene 3D staging */

type Stage3D = { cam: [number, number, number]; look: [number, number, number]; char: [number, number, number]; scale: number; pose: Pose; mood: Mood };

function staging(sc: TimedScene): Stage3D {
  switch (sc.type) {
    case "hook":
      return { cam: [0, 0.2, 9], look: [0, -0.2, 0], char: [0, -2.05, 0.6], scale: 0.78, pose: "wave", mood: "happy" };
    case "puzzle":
    case "card":
      return { cam: [0.4, 0.1, 9.6], look: [0, -0.3, 0], char: [-0.95, -2.05, 1.3], scale: 0.6, pose: "point", mood: "think" };
    case "countdown":
      return { cam: [0, -0.4, 8.6], look: [0, -0.9, 0], char: [0, -2.0, 0.8], scale: 0.8, pose: "think", mood: "think" };
    case "reveal":
      return { cam: [-0.3, 0, 9.2], look: [0, -0.3, 0], char: [0.95, -2.0, 1.2], scale: 0.65, pose: "cheer", mood: "happy" };
    case "talk":
      return { cam: [0.2, -0.3, 7.4], look: [0, -0.7, 0], char: [0, -2.15, 0.5], scale: 1.0, pose: sc.mood === "cry" ? "facepalm" : sc.mood === "shock" ? "shrug" : sc.mood === "think" ? "think" : "wave", mood: sc.mood ?? "happy" };
    case "outro":
      return { cam: [0, 0, 8.8], look: [0, -0.4, 0], char: [0, -2.05, 0.6], scale: 0.75, pose: "wave", mood: "cool" };
  }
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: number[], b: number[], k: number) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)] as [number, number, number];

/* ----------------------------------------------------------------- UI */

function Header({ series }: { series: EpisodeProps["series"] }) {
  const s = SERIES[series];
  return (
    <div style={{ position: "absolute", top: 70, left: 56, right: 56, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Anton", fontSize: 54, color: C.white, textShadow: "0 4px 0 rgba(0,0,0,.35)" }}>
        <Img src={icon("1f37f")} style={{ width: 70, height: 70 }} />
        BINGE<span style={{ color: C.butter }}>BRAIN</span>
      </div>
      <div style={{ background: "rgba(14,7,38,.85)", color: s.accent, fontFamily: "Anton", fontSize: 28, padding: "8px 18px", borderRadius: 14, border: `2px solid ${s.accent}` }}>{s.tag}</div>
    </div>
  );
}

function Captions({ text, progress, accent, top }: { text: string; progress: number; accent: string; top?: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  const lit = Math.floor(progress * words.length + 0.5);
  const start = Math.max(0, Math.min(lit - 4, words.length - 8));
  const view = words.slice(start, start + 8);
  return (
    <div style={{ position: "absolute", left: 60, right: 150, ...(top ? { top } : { bottom: 470 }), display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 14px" }}>
      {view.map((w, i) => {
        const idx = start + i;
        const now = idx === lit - 1;
        return (
          <span key={idx} style={{ fontFamily: "Anton", fontSize: 64, color: now ? C.ink : idx < lit ? C.white : "rgba(255,255,255,.5)", background: now ? accent : "transparent", padding: "0 10px", borderRadius: 10, textShadow: now ? "none" : "0 5px 0 rgba(0,0,0,.5)", transform: now ? "scale(1.08)" : "none" }}>
            {w.toUpperCase()}
          </span>
        );
      })}
    </div>
  );
}

function Glass({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "linear-gradient(160deg, rgba(255,255,255,.22), rgba(255,255,255,.06))", border: "2px solid rgba(255,255,255,.35)", borderRadius: 34, boxShadow: "0 30px 60px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.5)", backdropFilter: "blur(14px)", ...style }}>
      {children}
    </div>
  );
}

function Expr({ items, size, f, delay, dark }: { items: string[]; size: number; f: number; delay: number; dark?: boolean }) {
  const { fps } = useVideoConfig();
  return (
    <>
      {items.map((it, i) => {
        const s = spring({ frame: f - delay - i * 3, fps, config: { damping: 11, stiffness: 160 } });
        return /^[+\-×÷=?]$/.test(it) || /^\d+$/.test(it) ? (
          <span key={i} style={{ fontFamily: "Anton", fontSize: size * 0.75, color: dark ? C.ink : C.white, transform: `scale(${s})`, width: size * 0.55, textAlign: "center" }}>{it}</span>
        ) : (
          <Img key={i} src={icon(it)} style={{ width: size, height: size, transform: `scale(${s}) rotate(${(1 - s) * -30}deg)`, filter: "drop-shadow(0 10px 10px rgba(0,0,0,.35))" }} />
        );
      })}
    </>
  );
}

function SceneUI({ sc, f, accent }: { sc: TimedScene; f: number; accent: string }) {
  const { fps } = useVideoConfig();
  const sp = (d: number, cfg = { damping: 12, stiffness: 140 }) => spring({ frame: f - d, fps, config: cfg });
  switch (sc.type) {
    case "hook":
      return (
        <div style={{ position: "absolute", top: 260, left: 50, right: 50, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontFamily: "Anton", fontSize: 128, lineHeight: 1, color: C.white, textAlign: "center", transform: `scale(${sp(4)}) rotate(${(1 - sp(4)) * 8}deg)`, textShadow: "0 12px 0 rgba(0,0,0,.35)" }}>{sc.text}</div>
          {sc.sub && <div style={{ marginTop: 26, background: accent, color: C.ink, fontFamily: "Anton", fontSize: 68, padding: "6px 30px", transform: `rotate(-3deg) scale(${sp(14)})`, boxShadow: "10px 10px 0 rgba(0,0,0,.3)" }}>{sc.sub}</div>}
        </div>
      );
    case "puzzle": {
      const qd = sc.rows.length * 14 + 10;
      return (
        <div style={{ position: "absolute", top: 220, left: 46, right: 46, display: "flex", flexDirection: "column", gap: 22 }}>
          {sc.rows.map((r, i) => (
            <Glass key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px 18px", opacity: interpolate(f, [i * 14, i * 14 + 8], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }), transform: `translateX(${(1 - sp(i * 14)) * (i % 2 ? 300 : -300)}px)` }}>
              <Expr items={r.items} size={118} f={f} delay={i * 14 + 4} />
              <span style={{ fontFamily: "Anton", fontSize: 96, color: C.white, width: 60, textAlign: "center" }}>=</span>
              <span style={{ fontFamily: "Anton", fontSize: 108, color: C.butter }}>{r.equals}</span>
            </Glass>
          ))}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "16px 18px", borderRadius: 34, background: accent, transform: `scale(${sp(qd)})`, boxShadow: "0 18px 0 rgba(0,0,0,.3)" }}>
            <Expr items={sc.question.items} size={122} f={f} delay={qd + 4} dark />
            <span style={{ fontFamily: "Anton", fontSize: 100, color: C.ink, width: 60, textAlign: "center" }}>=</span>
            <span style={{ fontFamily: "Anton", fontSize: 128, color: C.ink, transform: `rotate(${Math.sin(f / 4) * 8}deg)` }}>?</span>
          </div>
          {sc.note && <div style={{ textAlign: "center", fontFamily: "Inter", fontWeight: 800, fontSize: 40, color: C.white, opacity: interpolate(f, [qd + 15, qd + 25], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }) }}>{sc.note}</div>}
        </div>
      );
    }
    case "card":
      return (
        <div style={{ position: "absolute", top: 240, left: 50, right: 50, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, transform: `scale(${sp(2)})` }}>
            {sc.icon && <Img src={icon(sc.icon)} style={{ width: 150, height: 150 }} />}
            <div style={{ fontFamily: "Anton", fontSize: 96, color: C.white, lineHeight: 1, textShadow: "0 8px 0 rgba(0,0,0,.3)" }}>{sc.title}</div>
          </div>
          {sc.lines.map((l, i) => (
            <Glass key={i} style={{ padding: "22px 30px", fontFamily: "Inter", fontWeight: 800, fontSize: 48, color: C.white, opacity: interpolate(f, [10 + i * 14, 20 + i * 14], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }), transform: `translateY(${(1 - sp(10 + i * 14)) * 80}px)` }}>{l}</Glass>
          ))}
        </div>
      );
    case "countdown": {
      const left = Math.max(1, Math.ceil(sc.seconds - f / fps));
      const p = f / (sc.seconds * fps);
      const beat = spring({ frame: f % fps, fps, config: { damping: 8, stiffness: 220 } });
      return (
        <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontFamily: "Anton", fontSize: 92, color: C.white, textShadow: "0 8px 0 rgba(0,0,0,.35)" }}>COMMENT YOUR ANSWER</div>
          <div style={{ position: "relative", width: 480, height: 480, marginTop: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={480} height={480} style={{ position: "absolute" }}>
              <circle cx={240} cy={240} r={200} fill="rgba(14,7,38,.55)" stroke="rgba(255,255,255,.2)" strokeWidth={28} />
              <circle cx={240} cy={240} r={200} fill="none" stroke={accent} strokeWidth={28} strokeLinecap="round" strokeDasharray={2 * Math.PI * 200} strokeDashoffset={2 * Math.PI * 200 * p} transform="rotate(-90 240 240)" />
            </svg>
            <div style={{ fontFamily: "Anton", fontSize: 280, color: C.white, transform: `scale(${1.25 - beat * 0.25})` }}>{left}</div>
          </div>
        </div>
      );
    }
    case "reveal": {
      const flip = sp(12, { damping: 10, stiffness: 120 });
      const size = sc.answer.length <= 3 ? 280 : sc.answer.length <= 6 ? 190 : 120;
      return (
        <div style={{ position: "absolute", top: 230, left: 50, right: 50, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ fontFamily: "Anton", fontSize: 86, color: C.white, textShadow: "0 8px 0 rgba(0,0,0,.35)" }}>THE ANSWER IS...</div>
          <div style={{ marginTop: 20, background: C.butter, color: C.ink, fontFamily: "Anton", fontSize: size, padding: "0 50px", borderRadius: 40, transform: `perspective(900px) rotateY(${(1 - flip) * 180}deg) rotate(-3deg)`, boxShadow: "0 20px 0 rgba(0,0,0,.3)" }}>{sc.answer}</div>
          {(sc.steps ?? []).map((s, i) => (
            <Glass key={i} style={{ marginTop: 18, padding: "12px 24px", fontFamily: "Inter", fontWeight: 800, fontSize: 40, color: C.white, maxWidth: 620, opacity: interpolate(f, [40 + i * 18, 50 + i * 18], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }) }}>{s}</Glass>
          ))}
        </div>
      );
    }
    case "talk": {
      const shown = sc.say.slice(0, Math.ceil(sc.say.length * Math.min(1, f / Math.max(10, sc.dur * 0.6))));
      return (
        <div style={{ position: "absolute", top: 210, left: 46, right: 46, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {sc.place && <div style={{ background: C.ink, color: C.butter, fontFamily: "Anton", fontSize: 40, padding: "6px 22px", borderRadius: 12, transform: `scale(${sp(0)})` }}>{sc.place}</div>}
          <div style={{ marginTop: 22, background: C.white, borderRadius: 46, padding: "30px 40px", fontFamily: "Inter", fontWeight: 800, fontSize: 46, lineHeight: 1.25, color: C.ink, minHeight: 200, width: "100%", boxShadow: "0 16px 0 rgba(0,0,0,.25)", transform: `scale(${sp(3)})`, transformOrigin: "bottom center" }}>
            <span style={{ color: SERIES.comic.accent === C.butter ? C.pink : C.grape }}>{sc.who.toUpperCase()}: </span>
            {shown}
          </div>
          <div style={{ width: 0, height: 0, borderLeft: "36px solid transparent", borderRight: "36px solid transparent", borderTop: `46px solid ${C.white}` }} />
        </div>
      );
    }
    case "outro":
      return (
        <div style={{ position: "absolute", top: 250, left: 50, right: 50, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontFamily: "Anton", fontSize: 112, lineHeight: 1.02, color: C.white, textAlign: "center", transform: `scale(${sp(2)})`, textShadow: "0 10px 0 rgba(0,0,0,.35)" }}>{sc.text}</div>
          <div style={{ marginTop: 30, background: C.pink, color: C.white, fontFamily: "Anton", fontSize: 62, padding: "12px 40px", borderRadius: 60, transform: `scale(${sp(12)})`, boxShadow: "0 12px 0 rgba(0,0,0,.3)" }}>FOLLOW @QOMMENT.CHAT</div>
          {sc.next && <div style={{ marginTop: 26, fontFamily: "Inter", fontWeight: 800, fontSize: 44, color: C.butter, opacity: interpolate(f, [24, 34], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }) }}>{sc.next}</div>}
        </div>
      );
  }
}

/* ------------------------------------------------------------ episode */

export const Episode: React.FC<EpisodeProps> = (props) => {
  useFonts();
  const texPaths = props.scenes.flatMap((x) => [
    ...(x.backdrop ? [x.backdrop] : []),
    ...(x.type === "talk" ? (x.props ?? []).map((p) => `icons/${p}.png`) : []),
    ...(x.type === "hook" ? [`icons/${x.icon ?? "1f9e0"}.png`] : []),
  ]);
  const textures = usePreloadedTextures(texPaths);
  const tx = (p?: string) => (p && textures ? textures.get(p) : undefined);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = SERIES[props.series];
  const idx = Math.max(0, props.scenes.findIndex((x) => frame >= x.from && frame < x.from + x.dur));
  const sc = props.scenes[idx];
  const f = frame - sc.from;
  const time = frame / fps;

  // smooth staging transition between scenes
  const cur = staging(sc);
  const prev = idx > 0 ? staging(props.scenes[idx - 1]) : cur;
  const k = spring({ frame: f, fps, config: { damping: 18, stiffness: 90 } });
  const cam = lerp3(prev.cam, cur.cam, k);
  // slow push-in during each scene
  cam[2] -= Math.min(1, f / (sc.dur || 1)) * 0.5;
  const look = lerp3(prev.look, cur.look, k);
  const char = lerp3(prev.char, cur.char, k);
  const scale = lerp(prev.scale, cur.scale, k);

  // entrance jump on the first scene + hop on reveal
  const drop = idx === 0 ? (1 - spring({ frame: f - 2, fps, config: { damping: 9, stiffness: 120 } })) * 5 : 0;
  const hop = sc.type === "reveal" ? Math.max(0, Math.sin(Math.max(0, f - 10) / 6)) * (f > 10 && f < 60 ? 0.6 : 0) : 0;
  const land = idx === 0 ? Math.max(0, 1 - Math.abs(f - 14) / 6) : 0;

  const mouth = sc.env ? (sc.env[Math.max(0, f - 4)] ?? 0) : 0;
  const speaker = sc.type === "talk" && sc.who.toLowerCase() !== "kernel" ? (sc.who.toLowerCase().includes("box") ? "box" : "cup") : "kernel";
  const say = "say" in sc ? sc.say : undefined;
  const sayFrames = sc.env?.length ?? sc.dur;

  return (
    <AbsoluteFill style={{ backgroundImage: `linear-gradient(170deg, ${s.bg[0]}, ${s.bg[1]})` }}>
      <style>{fontCss}</style>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ fov: 34, near: 0.1, far: 50, position: cam }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, preserveDrawingBuffer: true }}
      >
        <CameraRig pos={cam} look={look} />
        <fog attach="fog" args={[s.bg[0], 9, 22]} />
        <Lights accent={s.accent} />
        <Backdrop tex={tx(sc.backdrop)} tint={s.bg[1]} />
        <Particles time={time} color={s.accent} />
        <Stage floorColor={s.floor} />
        <Character
          time={time}
          mouth={mouth}
          mood={cur.mood}
          pose={cur.pose}
          kind={speaker}
          position={[char[0], char[1] + drop + hop, char[2]]}
          scale={scale}
          squash={land}
          lean={Math.sin(time * 1.7) * 0.03}
        />
        {sc.type === "talk" &&
          (sc.props ?? []).map((p, i) => <Sprite key={`${idx}-${i}`} tex={tx(`icons/${p}.png`)} position={[i % 2 ? 0.82 : -0.82, -1.55 + (i % 2) * 0.25, 2.1]} size={0.55} time={time} phase={i * 1.7} />)}
        {sc.type === "hook" && <Sprite tex={tx(`icons/${sc.icon ?? "1f9e0"}.png`)} position={[1.15, -0.85, 1.2]} size={0.9} time={time} />}
        {sc.type === "reveal" && <Confetti t={(f - 12) / fps} />}
      </ThreeCanvas>

      {/* soft vignette for depth */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.45))" }} />
      <Header series={props.series} />
      <SceneUI key={idx} sc={sc} f={f} accent={s.accent} />
      {say && sc.type !== "talk" && <Captions text={say} progress={Math.min(1, f / Math.max(1, sayFrames))} accent={s.accent} top={sc.type === "hook" || sc.type === "outro" ? 760 : undefined} />}
      {sc.backdrop && <div style={{ position: "absolute", left: 24, bottom: 20, fontFamily: "Inter", fontWeight: 800, fontSize: 18, color: "rgba(255,255,255,.55)" }}>AI backdrop: pollinations.ai</div>}

      {/* audio */}
      {props.scenes.map((x, i) => (
        <Sequence key={`a${i}`} from={x.from} durationInFrames={x.dur}>
          <Audio src={staticFile(props.sfx.whoosh)} volume={0.45} />
          {x.audio && (
            <Sequence from={4}>
              <Audio src={staticFile(x.audio)} volume={1} />
            </Sequence>
          )}
          {x.type === "countdown" && Array.from({ length: x.seconds }, (_, j) => (
            <Sequence key={j} from={j * fps} durationInFrames={10}>
              <Audio src={staticFile(props.sfx.tick)} volume={0.7} />
            </Sequence>
          ))}
          {x.type === "reveal" && (
            <Sequence from={12}>
              <Audio src={staticFile(props.sfx.ding)} volume={0.9} />
            </Sequence>
          )}
        </Sequence>
      ))}
      {props.music && <Audio src={staticFile(props.music)} volume={0.12} loop />}
    </AbsoluteFill>
  );
};
