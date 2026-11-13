import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, Img, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, Confetti, usePreloadedTextures } from "../World";
import { Floor, SetPieces, SET_STYLE, Sky } from "./Sets";
import { mixUpper, SEAT_DROP, Stickman, upperFor } from "./Stickman";
import type { Act, Beat, Mood, Place, StoryProps, TimedBeat } from "./types";

const INK = "#0E0726";
const BUTTER = "#FFD23F";

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
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mix3 = (a: number[], b: number[], k: number) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)] as [number, number, number];
const mixAngle = (a: number, b: number, k: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};
const facing = (p: Place) => p[3] ?? (p[0] < 0 ? 0.55 : -0.55);
const HEAD_Y = 1.96;

/* ------------------------------------------- per-beat character states */

type CharBeat = { start: Place; end: Place; sitStart: boolean; sitEnd: boolean; act: Act; prevAct: Act; mood: Mood; first: boolean };

function plan(props: StoryProps) {
  const out: Record<string, CharBeat>[] = [];
  let scene = -1;
  let cur: Record<string, Place> = {};
  let sitting = new Set<string>();
  let lastAct: Record<string, Act> = {};
  let lastMood: Record<string, Mood> = {};
  for (const b of props.beats) {
    const first = b.scene !== scene;
    if (first) {
      scene = b.scene;
      const sc = props.scenes[scene];
      cur = { ...sc.at };
      sitting = new Set(sc.sit ?? []);
      lastAct = {};
      lastMood = {};
    }
    const states: Record<string, CharBeat> = {};
    for (const c of Object.keys(cur)) {
      const speaking = c === b.who && !b.phone;
      const keep = lastAct[c] === "phone" || lastAct[c] === "type" ? lastAct[c] : "idle";
      const act: Act = speaking ? (b.act ?? "talk") : keep;
      const mood: Mood = speaking ? (b.mood ?? "happy") : (lastMood[c] ?? "happy");
      const end = b.move?.[c] ?? cur[c];
      states[c] = { start: cur[c], end, sitStart: sitting.has(c), sitEnd: sitting.has(c) || b.sitAt === c, act, prevAct: lastAct[c] ?? act, mood, first };
      cur[c] = end;
      lastAct[c] = act;
      lastMood[c] = mood;
      if (b.sitAt === c) sitting.add(c);
    }
    out.push(states);
  }
  return out;
}

type Live = { pos: [number, number, number]; rotY: number; sit: number; walk: number; walkAmt: number };

function live(s: CharBeat, f: number): Live {
  const dx = s.end[0] - s.start[0];
  const dz = s.end[2] - s.start[2];
  const dist = Math.hypot(dx, dz);
  if (dist < 0.01) return { pos: [s.start[0], s.start[1], s.start[2]], rotY: facing(s.end), sit: s.sitEnd ? 1 : 0, walk: 0, walkAmt: 0 };
  const frames = Math.max(24, (dist / 1.25) * 30);
  const e = smooth(f / frames);
  const amt = clamp01(Math.min(e, 1 - e) * 7);
  const dir = Math.atan2(dx, dz);
  const base = e < 0.5 ? facing(s.start) : facing(s.end);
  return {
    pos: mix3(s.start as number[], s.end as number[], e),
    rotY: mixAngle(base, dir, clamp01(amt * 1.6)),
    sit: s.sitEnd && !s.sitStart ? smooth((f - frames) / 14) : s.sitEnd ? 1 : 0,
    walk: e * dist * 8,
    walkAmt: amt,
  };
}

/* ---------------------------------------------------------------- camera */

type Cam = { pos: [number, number, number]; look: [number, number, number] };

function camFor(b: Beat, states: Record<string, CharBeat>, f: number): Cam {
  const present = Object.keys(states);
  const target = b.who in states && !b.phone ? b.who : present.find((c) => c !== b.who) ?? present[0];
  switch (b.shot ?? "two") {
    case "wide":
      return { pos: [0, 1.9, 7.4], look: [0, 1.55, 0] };
    case "card":
      return { pos: [0, 2.35, 7.8], look: [0, 2.2, 0] };
    case "close": {
      const L = live(states[target], f);
      const hy = HEAD_Y - L.sit * SEAT_DROP;
      const rot = facing(states[target].end);
      return { pos: [L.pos[0] + Math.sin(rot) * 1.25, hy - 0.02, L.pos[2] + 3.0], look: [L.pos[0] * 0.92, hy - 0.2, L.pos[2]] };
    }
    case "two":
    default: {
      const xs = present.map((c) => live(states[c], f).pos[0]);
      const cx = present.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
      const seated = present.some((c) => states[c].sitEnd);
      return { pos: [cx, seated ? 1.55 : 1.65, 5.0], look: [cx, seated ? 1.25 : 1.45, 0] };
    }
  }
}

/* -------------------------------------------------------------------- UI */

function chunks(text: string): string[] {
  const parts = text.match(/[^.!?…]+[.!?…]*\s*/g) ?? [text];
  const out: string[] = [];
  for (const p of parts.map((x) => x.trim()).filter(Boolean)) {
    const last = out[out.length - 1];
    if (last && last.length + p.length < 90) out[out.length - 1] = `${last} ${p}`;
    else out.push(p);
  }
  return out;
}

function Bubble({ beat, f, color, name, side, phone }: { beat: TimedBeat; f: number; color: string; name: string; side: number; phone?: boolean }) {
  const { fps } = useVideoConfig();
  const text = beat.text ?? beat.say ?? "";
  const cs = chunks(text);
  const total = cs.reduce((a, c) => a + c.length, 0);
  const p = clamp01((f - 4) / Math.max(1, beat.speech));
  let acc = 0;
  let ci = cs.length - 1;
  let local = 1;
  for (let i = 0; i < cs.length; i++) {
    const share = cs[i].length / total;
    if (p <= acc + share || i === cs.length - 1) {
      ci = i;
      local = clamp01((p - acc) / share);
      break;
    }
    acc += share;
  }
  const words = cs[ci].split(/\s+/);
  const lit = Math.ceil(local * words.length);
  const pop = spring({ frame: f, fps, config: { damping: 13, stiffness: 170 } });
  const tail = 50 + side * 26;
  return (
    <div style={{ position: "absolute", top: 236, left: 44, right: 44, transform: `scale(${0.85 + pop * 0.15})`, opacity: pop, transformOrigin: `${tail}% 100%` }}>
      <div style={{ background: "#FFFFFF", borderRadius: 40, border: `7px solid ${color}`, padding: "22px 34px 28px", boxShadow: `0 16px 0 rgba(0,0,0,.25), 0 0 40px ${color}55` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <div style={{ background: color, color: INK, fontFamily: "Anton", fontSize: 40, padding: "2px 22px", borderRadius: 999, letterSpacing: 1 }}>{name.toUpperCase()}</div>
          {phone && <Img src={icon("1f4f1")} style={{ width: 52, height: 52 }} />}
          {phone && <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 28, color: "#6B7280" }}>ON THE PHONE</div>}
        </div>
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 48, lineHeight: 1.22, color: INK, display: "flex", flexWrap: "wrap", gap: "0 13px" }}>
          {words.map((w, i) => (
            <span key={i} style={{ color: i < lit ? INK : "#B8B4C7", background: i === lit - 1 ? `${color}66` : "transparent", borderRadius: 10, padding: "0 4px", margin: "0 -4px" }}>
              {w}
            </span>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: `${tail}%`, bottom: -34, marginLeft: -26, width: 0, height: 0, borderLeft: "26px solid transparent", borderRight: "26px solid transparent", borderTop: `40px solid ${color}` }} />
    </div>
  );
}

function CardPanel({ card, f, color }: { card: NonNullable<Beat["card"]>; f: number; color: string }) {
  const { fps } = useVideoConfig();
  const sp = (d: number) => spring({ frame: f - d, fps, config: { damping: 12, stiffness: 140 } });
  return (
    <div style={{ position: "absolute", top: 640, left: 56, right: 56, transform: `translateY(${(1 - sp(10)) * 120}px)`, opacity: clamp01((f - 8) / 8) }}>
      <div style={{ background: "linear-gradient(160deg, rgba(14,7,38,.88), rgba(40,20,80,.82))", border: `4px solid ${color}`, borderRadius: 36, padding: "26px 30px", boxShadow: `0 24px 50px rgba(0,0,0,.45), 0 0 50px ${color}44` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 12 }}>
          <Img src={icon(card.icon)} style={{ width: 92, height: 92, transform: `scale(${sp(12)}) rotate(${(1 - sp(12)) * -40}deg)` }} />
          <div style={{ fontFamily: "Anton", fontSize: 64, color: BUTTER, lineHeight: 1 }}>{card.title}</div>
        </div>
        {card.lines.map((l, i) => {
          const [code, t] = l.includes("|") ? l.split("|") : ["", l];
          const s = sp(18 + i * 9);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, opacity: s, transform: `translateX(${(1 - s) * -60}px)` }}>
              {code ? <Img src={icon(code)} style={{ width: 58, height: 58 }} /> : <div style={{ width: 16, height: 16, borderRadius: 8, background: color }} />}
              <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 42, color: "#fff", lineHeight: 1.15 }}>{t}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- story */

export const Story: React.FC<StoryProps> = (props) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const plans = useMemo(() => plan(props), [props]);
  const textures = usePreloadedTextures([
    ...props.scenes.map((s) => s.backdropFile).filter((x): x is string => !!x),
  ]);
  if (!props.beats.length) return null;
  const idx = Math.max(0, props.beats.findIndex((b) => frame >= b.from && frame < b.from + b.dur));
  const beat = props.beats[idx];
  const f = frame - beat.from;
  const time = frame / fps;
  const scene = props.scenes[beat.scene];
  const style = SET_STYLE[scene.set];
  const states = plans[idx];

  // camera: ease from the previous beat's framing (same scene), hard cut between scenes
  const now = camFor(beat, states, f);
  const prevBeat = props.beats[idx - 1];
  const sameScene = prevBeat && prevBeat.scene === beat.scene;
  const prev = sameScene ? camFor(prevBeat, plans[idx - 1], prevBeat.dur) : now;
  const k = sameScene ? spring({ frame: f, fps, config: { damping: 20, stiffness: 70 } }) : 1;
  let pos = mix3(prev.pos, now.pos, k);
  const look = mix3(prev.look, now.look, k);
  const push = 1 - 0.05 * clamp01(f / beat.dur);
  pos = [look[0] + (pos[0] - look[0]) * push + Math.sin(time * 0.35) * 0.08, look[1] + (pos[1] - look[1]) * push, look[2] + (pos[2] - look[2]) * push];

  const sceneStart = props.beats.find((b) => b.scene === beat.scene)!.from;
  const fade = 1 - clamp01((frame - sceneStart) / 9);
  const speakerColor = props.cast[beat.who]?.color ?? BUTTER;
  const speakerState = states[beat.who];
  const speakerX = speakerState ? live(speakerState, f).pos[0] : 0;
  const shot = beat.shot ?? "two";

  return (
    <AbsoluteFill style={{ background: style.sky }}>
      <style>{fontCss}</style>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 40, near: 0.1, far: 60, position: pos }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, preserveDrawingBuffer: true }}>
        <CameraRig pos={pos} look={look} />
        <fog attach="fog" args={[style.fog, 10, 26]} />
        <hemisphereLight args={style.hemi} />
        <directionalLight castShadow position={[2.5, 6, 4]} intensity={2.2} color={style.key} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-bias={-0.0005} />
        <pointLight position={[-2.5, 2.5, 2]} intensity={10} color={style.rim} distance={9} />
        <pointLight position={[2.5, 2.2, -1.5]} intensity={8} color={style.rim} distance={9} />
        <Sky tex={scene.backdropFile && textures ? textures.get(scene.backdropFile) : undefined} color={style.sky} />
        <Floor color={style.floor} glossy={scene.set === "studio"} />
        <SetPieces set={scene.set} props={scene.props ?? []} />

        {Object.entries(states).map(([c, s], i) => {
          const cast = props.cast[c];
          const L = live(s, f);
          const speaking = c === beat.who && !beat.phone && f >= 4 && f < 4 + (beat.env?.length ?? 0);
          const env = speaking ? (beat.env?.[f - 4] ?? 0) : 0;
          const blend = s.first ? 1 : smooth(f / 9);
          const upper = mixUpper(upperFor(s.prevAct, time, 0, false), upperFor(s.act, time, env, speaking || (c === beat.who && !beat.phone)), blend);
          const cheering = s.act === "cheer" && c === beat.who;
          const jump = cheering && f < 70 ? Math.abs(Math.sin(f * 0.19)) * 0.2 * (1 - L.sit) : 0;
          const isSpeaker = c === beat.who && !beat.phone;
          return (
            <group key={c}>
              <Stickman
                color={cast.color}
                look={cast.look}
                glasses={cast.glasses}
                hair={cast.hair}
                upper={upper}
                sit={L.sit}
                walk={L.walk}
                walkAmt={L.walkAmt}
                jump={jump}
                mouth={env}
                mood={s.mood}
                time={time}
                blinkSeed={i * 1.3}
                position={L.pos}
                rotY={L.rotY}
                gradCap={scene.place.includes("GRADUATION") && c !== "quddus"}
                phone={s.act === "phone"}
              />
              {/* speaker glow ring */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[L.pos[0], 0.012, L.pos[2]]}>
                <ringGeometry args={[0.36, 0.46, 48]} />
                <meshBasicMaterial color={cast.color} transparent opacity={isSpeaker ? 0.65 + Math.sin(time * 6) * 0.2 : 0.18} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
        {(beat.confetti || idx === 0) && <Confetti t={(f - 6) / fps} />}
      </ThreeCanvas>

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.5))" }} />

      {/* header: brand + place, then the colour key for who is who */}
      <div style={{ position: "absolute", top: 64, left: 44, right: 44, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {props.brand === "fundintech" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Anton", fontSize: 46, color: "#fff", textShadow: "0 4px 0 rgba(0,0,0,.4)" }}>
            <Img src={icon("1f4b0")} style={{ width: 58, height: 58 }} />
            FUND<span style={{ color: BUTTER }}>IN</span>TECH
            <span style={{ fontSize: 30, background: "#22D3EE", color: INK, padding: "0 12px", borderRadius: 8, marginLeft: 6 }}>STORIES</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Anton", fontSize: 46, color: "#fff", textShadow: "0 4px 0 rgba(0,0,0,.4)" }}>
            <Img src={icon("1f37f")} style={{ width: 58, height: 58 }} />
            BINGE<span style={{ color: BUTTER }}>BRAIN</span>
            <span style={{ fontSize: 30, background: BUTTER, color: INK, padding: "0 12px", borderRadius: 8, marginLeft: 6 }}>STORIES</span>
          </div>
        )}
        <div style={{ background: "rgba(14,7,38,.85)", color: BUTTER, fontFamily: "Anton", fontSize: 28, padding: "6px 16px", borderRadius: 12, border: `2px solid ${BUTTER}` }}>{scene.place}</div>
      </div>
      <div style={{ position: "absolute", top: 152, left: 44, display: "flex", gap: 12 }}>
        {Object.entries(props.cast).map(([c, m]) => {
          const on = c === beat.who && !!beat.say;
          return (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 18px", borderRadius: 999, background: on ? m.color : "rgba(14,7,38,.7)", border: `3px solid ${m.color}`, fontFamily: "Anton", fontSize: 30, color: on ? INK : m.color, transform: `scale(${on ? 1.06 : 1})` }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: on ? INK : m.color }} />
              {m.name.toUpperCase()}
            </div>
          );
        })}
      </div>

      {beat.title && (
        <div style={{ position: "absolute", top: 300, left: 50, right: 50, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontFamily: "Anton", fontSize: 124, lineHeight: 1, textAlign: "center", color: "#fff", textShadow: "0 10px 0 rgba(0,0,0,.4)", transform: `scale(${spring({ frame: f - 3, fps, config: { damping: 11, stiffness: 140 } })})` }}>{beat.title}</div>
          {beat.sub && <div style={{ marginTop: 26, background: BUTTER, color: INK, fontFamily: "Anton", fontSize: 50, padding: "6px 28px", transform: `rotate(-2deg) scale(${spring({ frame: f - 14, fps })})`, boxShadow: "8px 8px 0 rgba(0,0,0,.3)" }}>{beat.sub}</div>}
        </div>
      )}
      {beat.say && <Bubble key={idx} beat={beat} f={f} color={speakerColor} name={props.cast[beat.who]?.name ?? beat.who} side={shot === "close" || beat.phone ? 0 : speakerX < 0 ? -1 : 1} phone={beat.phone} />}
      {beat.card && <CardPanel key={`c${idx}`} card={beat.card} f={f} color={speakerColor} />}
      {beat.end && (
        <div style={{ position: "absolute", top: 700, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <div style={{ background: "#FF2E88", color: "#fff", fontFamily: "Anton", fontSize: 66, padding: "12px 44px", borderRadius: 60, transform: `scale(${spring({ frame: f - 8, fps })})`, boxShadow: "0 12px 0 rgba(0,0,0,.3)" }}>{props.brand === "fundintech" ? "FOLLOW @FUNDNTECH" : "FOLLOW @QOMMENT.CHAT"}</div>
          <div style={{ fontFamily: "Anton", fontSize: 54, color: BUTTER, opacity: clamp01((f - 20) / 10), textShadow: "0 5px 0 rgba(0,0,0,.4)" }}>{beat.sub ?? "NEW STORY EVERY DAY"}</div>
        </div>
      )}
      {scene.backdropFile && <div style={{ position: "absolute", left: 24, bottom: 20, fontFamily: "Inter", fontWeight: 800, fontSize: 18, color: "rgba(255,255,255,.55)" }}>AI backdrop: pollinations.ai</div>}
      <AbsoluteFill style={{ background: "#000", opacity: beat.scene === 0 ? 0 : fade }} />

      {/* audio */}
      {props.beats.map((b, i) => (
        <Sequence key={`a${i}`} from={b.from} durationInFrames={b.dur}>
          {(i === 0 || props.beats[i - 1].scene !== b.scene) && <Audio src={staticFile(props.sfx.whoosh)} volume={0.5} />}
          {b.audio && (
            <Sequence from={4}>
              <Audio src={staticFile(b.audio)} volume={1} />
            </Sequence>
          )}
          {b.card && (
            <Sequence from={10}>
              <Audio src={staticFile(props.sfx.pop)} volume={0.6} />
            </Sequence>
          )}
          {(b.confetti || i === 0) && (
            <Sequence from={6}>
              <Audio src={staticFile(props.sfx.ding)} volume={0.6} />
            </Sequence>
          )}
        </Sequence>
      ))}
      {props.music && <Audio src={staticFile(props.music)} volume={0.1} loop />}
    </AbsoluteFill>
  );
};
