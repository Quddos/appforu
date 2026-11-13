import * as THREE from "three";
import type { Act, Mood } from "./types";

/* ------------------------------------------------------------ pose maths */

export type Arm = { f: number; o: number; e: number };
export type Upper = { l: Arm; r: Arm; spine: number; head: [number, number, number] };

const arm = (f: number, o: number, e: number): Arm => ({ f, o, e });
const rest = arm(0.05, 0.12, 0.2);

/** Upper-body pose for an action. `talk` (0..1) is the live voice level, `t` seconds. */
export function upperFor(act: Act, t: number, talk: number, speaking: boolean): Upper {
  const g = speaking ? talk : 0;
  const w = Math.sin(t * 9);
  switch (act) {
    case "wave":
      return { l: rest, r: arm(0.15, 2.5, 0.35 + 0.45 * (w * 0.5 + 0.5)), spine: 0, head: [0, 0, 0.12 * Math.sin(t * 2)] };
    case "cheer": {
      const b = Math.sin(t * 7);
      return { l: arm(0.25, 2.55 + b * 0.15, 0.25), r: arm(0.25, 2.55 - b * 0.15, 0.25), spine: -0.08, head: [-0.18, 0, 0] };
    }
    case "facepalm":
      return { l: arm(0.4, 0.2, 1.2), r: arm(1.35, 0.32, 2.35), spine: 0.12, head: [0.32, 0, 0.1] };
    case "think":
      return { l: arm(0.75, 0.05, 1.75), r: arm(0.95, 0.12, 2.45), spine: 0.04, head: [-0.1, 0, 0.16] };
    case "shrug":
      return { l: arm(0.35, 0.55, 1.5 + g * 0.2), r: arm(0.35, 0.55, 1.5 + g * 0.2), spine: 0, head: [0, 0, 0.18] };
    case "point":
      return { l: rest, r: arm(1.35 + g * 0.1, 0.35, 0.12), spine: 0.05, head: [0, 0, 0] };
    case "phone":
      return { l: arm(0.55 + g * 0.2, 0.25, 1.1 + g * 0.4), r: arm(1.05, 0.42, 2.55), spine: 0, head: [0, 0, -0.18] };
    case "type": {
      const k = Math.sin(t * 22) * 0.08;
      return { l: arm(0.95, 0.12, 0.85 + k), r: arm(0.95, 0.12, 0.85 - k), spine: 0.18, head: [0.28, 0, 0] };
    }
    case "worried":
      return { l: arm(0.7, -0.15, 1.45), r: arm(0.7, -0.15, 1.45), spine: 0.08, head: [0.12, 0, -0.1] };
    case "thumbs":
      return { l: rest, r: arm(1.0, 0.25, 1.6 + Math.sin(t * 6) * 0.08), spine: 0, head: [0, 0, 0.1] };
    case "talk":
    case "idle":
    default: {
      const s = Math.sin(t * 5.2);
      return speaking
        ? { l: arm(0.35 + g * 0.25, 0.22, 1.0 + g * 0.5), r: arm(0.55 + g * 0.35 + s * 0.08, 0.28, 1.25 + g * 0.45), spine: 0.02, head: [0.06 * s, 0, 0.06 * Math.sin(t * 2.3)] }
        : { l: rest, r: rest, spine: 0, head: [0, 0, 0.04 * Math.sin(t * 1.5)] };
    }
  }
}

const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mixArm = (a: Arm, b: Arm, k: number): Arm => ({ f: mix(a.f, b.f, k), o: mix(a.o, b.o, k), e: mix(a.e, b.e, k) });
export const mixUpper = (a: Upper, b: Upper, k: number): Upper => ({
  l: mixArm(a.l, b.l, k),
  r: mixArm(a.r, b.r, k),
  spine: mix(a.spine, b.spine, k),
  head: [mix(a.head[0], b.head[0], k), mix(a.head[1], b.head[1], k), mix(a.head[2], b.head[2], k)],
});

/* -------------------------------------------------------------- the rig */

const THIGH = 0.48;
const SHIN = 0.46;
const FOOT = 0.05;
const HIP_Y = THIGH + SHIN + FOOT;
const TORSO = 0.6;
const UPPER = 0.36;
const FORE = 0.34;
const R = 0.27; // head radius
const LIMB = 0.048;
export const SEAT_DROP = HIP_Y - 0.56;

const SKIN = "#F4EEE6";
const INK = "#1B1530";

function Bone({ len, r = LIMB, color }: { len: number; r?: number; color: string }) {
  return (
    <>
      <mesh position={[0, -len / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, len, 14]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[r * 1.12, 14, 14]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
    </>
  );
}

function ArmRig({ a, side, color, holdPhone }: { a: Arm; side: 1 | -1; color: string; holdPhone?: boolean }) {
  return (
    <group position={[0.15 * side, TORSO - 0.05, 0]} rotation={new THREE.Euler(-a.f, 0, a.o * side, "XYZ")}>
      <Bone len={UPPER} color={color} />
      <group position={[0, -UPPER, 0]} rotation={[-a.e, 0, 0]}>
        <Bone len={FORE} color={color} />
        <mesh position={[0, -FORE - 0.02, 0]} castShadow>
          <sphereGeometry args={[0.062, 16, 16]} />
          <meshStandardMaterial color={color} roughness={0.35} />
        </mesh>
        {holdPhone && (
          <mesh position={[0.0, -FORE - 0.04, 0.05]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.09, 0.19, 0.03]} />
            <meshStandardMaterial color="#111827" roughness={0.2} metalness={0.6} />
          </mesh>
        )}
      </group>
    </group>
  );
}

function Leg({ hip, knee, side, color }: { hip: number; knee: number; side: 1 | -1; color: string }) {
  return (
    <group position={[0.09 * side, 0, 0]} rotation={[-hip, 0, 0]}>
      <Bone len={THIGH} color={color} />
      <group position={[0, -THIGH, 0]} rotation={[knee, 0, 0]}>
        <Bone len={SHIN} color={color} />
        <mesh position={[0, -SHIN - 0.01, 0.06]} castShadow>
          <capsuleGeometry args={[0.05, 0.1, 6, 12]} />
          <meshStandardMaterial color={INK} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/** a point on the head surface, slightly proud of it */
function onHead(x: number, y: number, lift = 0.004): [number, number, number] {
  return [x, y, Math.sqrt(Math.max(0, R * R - x * x - y * y)) + lift];
}

function Face({ mood, mouth, blink, look }: { mood: Mood; mouth: number; blink: boolean; look: number }) {
  const shock = mood === "shock";
  const eyeH = blink ? 0.008 : shock ? 0.06 : mood === "cool" ? 0.028 : 0.05;
  const eyeW = shock ? 0.042 : 0.036;
  const brow = mood === "worried" ? 0.35 : mood === "think" ? -0.15 : mood === "shock" ? 0.15 : -0.05;
  const talking = mouth > 0.06;
  return (
    <group>
      {([-1, 1] as const).map((s) => (
        <group key={s}>
          <mesh position={onHead(0.085 * s + look * 0.02, 0.035, 0)} scale={[eyeW, eyeH, 0.02]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color={INK} roughness={0.2} />
          </mesh>
          {!blink && (
            <mesh position={onHead(0.085 * s + 0.012 + look * 0.02, 0.05, 0.012)}>
              <sphereGeometry args={[0.011, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          )}
          <mesh position={onHead(0.085 * s, 0.115 + (shock ? 0.02 : 0), 0.004)} rotation={[0, 0, brow * s * (mood === "think" && s === 1 ? -1.5 : 1)]}>
            <boxGeometry args={[0.07, 0.014, 0.01]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        </group>
      ))}
      {talking || shock ? (
        <mesh position={onHead(0, -0.09, 0)} scale={[shock && !talking ? 0.035 : 0.05, 0.012 + 0.05 * Math.min(1, mouth) + (shock && !talking ? 0.035 : 0), 0.02]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#7A1E3A" roughness={0.4} />
        </mesh>
      ) : mood === "worried" ? (
        <mesh position={onHead(0, -0.11, 0)} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.04, 0.009, 8, 16, Math.PI]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ) : (
        <mesh position={onHead(0, -0.075, 0)} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[mood === "think" ? 0.03 : 0.05, 0.009, 8, 16, Math.PI]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      )}
    </group>
  );
}

function Hair({ look, color }: { look: "girl" | "guy"; color: string }) {
  const hair = "#2A1B14";
  if (look === "guy")
    return (
      <>
        <mesh rotation={[-0.35, 0, 0]}>
          <sphereGeometry args={[R + 0.018, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
          <meshStandardMaterial color={hair} roughness={0.8} />
        </mesh>
        {/* glasses */}
        {([-1, 1] as const).map((s) => (
          <mesh key={s} position={onHead(0.085 * s, 0.035, 0.03)}>
            <torusGeometry args={[0.058, 0.009, 8, 24]} />
            <meshStandardMaterial color={INK} metalness={0.4} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={onHead(0, 0.045, 0.035)}>
          <boxGeometry args={[0.05, 0.01, 0.01]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </>
    );
  return (
    <>
      <mesh rotation={[-0.25, 0, 0]}>
        <sphereGeometry args={[R + 0.02, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.47]} />
        <meshStandardMaterial color={hair} roughness={0.75} />
      </mesh>
      {/* puff bun + ponytail */}
      <mesh position={[0, R * 0.75, -R * 0.75]} castShadow>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshStandardMaterial color={hair} roughness={0.75} />
      </mesh>
      <mesh position={[0, R * 0.25, -R * 1.05]} rotation={[0.5, 0, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.2, 8, 12]} />
        <meshStandardMaterial color={hair} roughness={0.75} />
      </mesh>
      {/* bow */}
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[0.06 * s, R * 0.88, -R * 0.55]} rotation={[0, 0, s * 0.6]}>
          <coneGeometry args={[0.045, 0.1, 12]} />
          <meshStandardMaterial color={color} roughness={0.3} />
        </mesh>
      ))}
      {/* cheeks + lashes */}
      {([-1, 1] as const).map((s) => (
        <mesh key={`c${s}`} position={onHead(0.15 * s, -0.04, 0)} scale={[0.04, 0.022, 0.01]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshStandardMaterial color="#FF8FB8" roughness={0.6} transparent opacity={0.8} />
        </mesh>
      ))}
    </>
  );
}

function GradCap() {
  return (
    <group position={[0, R * 0.92, 0.02]} rotation={[-0.15, 0, 0.08]}>
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.17, 0.19, 0.08, 24]} />
        <meshStandardMaterial color="#111" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.44, 0.025, 0.44]} />
        <meshStandardMaterial color="#111" roughness={0.6} />
      </mesh>
      <mesh position={[0.2, -0.06, 0.05]}>
        <cylinderGeometry args={[0.01, 0.025, 0.16, 8]} />
        <meshStandardMaterial color="#FFD23F" />
      </mesh>
    </group>
  );
}

export type StickmanProps = {
  color: string;
  look: "girl" | "guy";
  upper: Upper;
  sit: number; // 0..1
  walk: number; // phase (radians)
  walkAmt: number; // 0..1
  jump: number;
  mouth: number;
  mood: Mood;
  time: number;
  blinkSeed: number;
  position: [number, number, number];
  rotY: number;
  gradCap?: boolean;
  phone?: boolean;
  look2?: number;
};

export function Stickman(p: StickmanProps) {
  const sw = Math.sin(p.walk) * p.walkAmt;
  const hipL = 0.5 * sw + p.sit * 1.5;
  const hipR = -0.5 * sw + p.sit * 1.5;
  const kneeL = Math.max(0, -Math.sin(p.walk + 0.6)) * 0.75 * p.walkAmt + p.sit * 1.5;
  const kneeR = Math.max(0, Math.sin(p.walk + 0.6)) * 0.75 * p.walkAmt + p.sit * 1.5;
  const bob = Math.abs(Math.cos(p.walk)) * 0.035 * p.walkAmt;
  const breathe = Math.sin(p.time * 2.2 + p.blinkSeed) * 0.012;
  const u = p.upper;
  const swing = (side: 1 | -1): Arm => ({ ...(side === 1 ? u.l : u.r), f: (side === 1 ? u.l.f : u.r.f) - side * sw * 0.45 });
  const blinkT = (p.time + p.blinkSeed * 1.7) % 3.6;
  const blink = blinkT < 0.12;

  return (
    <group position={[p.position[0], p.position[1] + HIP_Y - p.sit * SEAT_DROP + bob + p.jump, p.position[2]]} rotation={[0, p.rotY, 0]}>
      <Leg hip={hipL} knee={kneeL} side={1} color={p.color} />
      <Leg hip={hipR} knee={kneeR} side={-1} color={p.color} />
      {/* pelvis */}
      <mesh castShadow>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={p.color} roughness={0.35} />
      </mesh>
      <group rotation={[u.spine, 0, 0]} scale={[1, 1 + breathe, 1]}>
        <mesh position={[0, TORSO / 2, 0]} castShadow>
          <capsuleGeometry args={[0.085, TORSO - 0.1, 8, 16]} />
          <meshStandardMaterial color={p.color} roughness={0.35} />
        </mesh>
        {/* shoulder bar */}
        <mesh position={[0, TORSO - 0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.055, 0.22, 6, 12]} />
          <meshStandardMaterial color={p.color} roughness={0.35} />
        </mesh>
        <ArmRig a={swing(1)} side={1} color={p.color} />
        <ArmRig a={swing(-1)} side={-1} color={p.color} holdPhone={p.phone} />
        <mesh position={[0, TORSO + 0.06, 0]}>
          <cylinderGeometry args={[0.04, 0.045, 0.12, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>
        <group position={[0, TORSO + 0.1 + R, 0]} rotation={[u.head[0], u.head[1], u.head[2]]}>
          <mesh castShadow>
            <sphereGeometry args={[R, 40, 40]} />
            <meshPhysicalMaterial color={SKIN} roughness={0.45} clearcoat={0.3} />
          </mesh>
          <Face mood={p.mood} mouth={p.mouth} blink={blink} look={p.look2 ?? 0} />
          <Hair look={p.look} color={p.color} />
          {p.gradCap && <GradCap />}
        </group>
      </group>
    </group>
  );
}
