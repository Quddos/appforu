import { useMemo } from "react";
import * as THREE from "three";

export type Mood = "happy" | "shock" | "think" | "cry" | "cool";
export type Pose = "idle" | "wave" | "cheer" | "think" | "point" | "shrug" | "facepalm";

type Props = {
  /** seconds, for idle motion */
  time: number;
  /** 0..1 mouth opening (from audio volume) */
  mouth: number;
  mood?: Mood;
  pose?: Pose;
  /** "kernel" = popcorn bucket, "cup" = coffee-cup client, "box" = cardboard box */
  kind?: "kernel" | "cup" | "box";
  position?: [number, number, number];
  scale?: number;
  /** extra lean (radians) e.g. from spring entry */
  lean?: number;
  /** 0..1 squash for jumps */
  squash?: number;
};

const BLINK_EVERY = 3.1;

function stripeTexture(a: string, b: string, stripes = 10) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 8;
  const g = c.getContext("2d")!;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? b : a;
    g.fillRect((i * 512) / stripes, 0, 512 / stripes + 1, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** deterministic pseudo-random for popcorn placement */
function rand(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function armAngles(pose: Pose, t: number): { l: [number, number]; r: [number, number] } {
  // [z rotation (raise), x rotation (forward)]
  switch (pose) {
    case "wave":
      return { l: [0.3, 0], r: [-2.4 + Math.sin(t * 9) * 0.35, 0] };
    case "cheer":
      return { l: [2.5 + Math.sin(t * 10) * 0.15, 0], r: [-2.5 - Math.sin(t * 10) * 0.15, 0] };
    case "think":
      return { l: [0.35, 0], r: [-2.1, -0.9] };
    case "point":
      return { l: [0.3, 0], r: [-1.55, -0.2] };
    case "shrug":
      return { l: [1.2, 0.4], r: [-1.2, 0.4] };
    case "facepalm":
      return { l: [0.3, 0], r: [-2.3, -1.2] };
    default:
      return { l: [0.35 + Math.sin(t * 2) * 0.05, 0], r: [-0.35 - Math.sin(t * 2 + 1) * 0.05, 0] };
  }
}

export function Character({ time, mouth, mood = "happy", pose = "idle", kind = "kernel", position = [0, 0, 0], scale = 1, lean = 0, squash = 0 }: Props) {
  const palette = {
    kernel: { a: "#E8202A", b: "#FFF4E6", rim: "#FFFFFF" },
    cup: { a: "#2563EB", b: "#DBEAFE", rim: "#F8FAFC" },
    box: { a: "#C08A4B", b: "#D9A869", rim: "#B07A3E" },
  }[kind];
  const stripes = useMemo(() => stripeTexture(palette.a, palette.b, kind === "box" ? 2 : 10), [palette.a, palette.b, kind]);

  const kernels = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => {
        const a = rand(i) * Math.PI * 2;
        const r = Math.sqrt(rand(i + 50)) * 0.62;
        const y = 1.12 + rand(i + 99) * 0.32 + (0.62 - r) * 0.45;
        return { p: [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number], s: 0.13 + rand(i + 7) * 0.07 };
      }),
    [],
  );

  // idle motion
  const bob = Math.sin(time * 2.4) * 0.04;
  const sway = Math.sin(time * 1.3) * 0.05 + lean;
  const blink = (time % BLINK_EVERY) < 0.12 ? 0.1 : 1;
  const eyeY = mood === "cry" ? 0.62 : 0.68;
  const pupilOffset = mood === "think" ? [0.04, 0.05] : [0, 0];
  const brow = { happy: 0.12, shock: 0.32, think: -0.25, cry: -0.35, cool: 0 }[mood];
  const arms = armAngles(pose, time);
  const sy = 1 - squash * 0.18;
  const sxz = 1 + squash * 0.12;
  const mOpen = Math.max(mood === "shock" ? 0.6 : 0.08, mouth);

  const skin = new THREE.MeshPhysicalMaterial({ map: stripes, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const white = { color: "#FFFFFF", roughness: 0.15, metalness: 0 };

  return (
    <group position={[position[0], position[1] + bob, position[2]]} scale={[scale * sxz, scale * sy, scale * sxz]} rotation={[0, 0, sway]}>
      {/* body */}
      <mesh castShadow receiveShadow material={skin} position={[0, 0.5, 0]}>
        {kind === "box" ? <boxGeometry args={[1.4, 1.3, 1.1]} /> : <cylinderGeometry args={[0.72, 0.5, 1.3, 48, 1, true]} />}
      </mesh>
      {kind !== "box" && (
        <>
          <mesh castShadow position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.02, 48]} />
            <meshStandardMaterial color={palette.a} />
          </mesh>
          <mesh castShadow position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.72, 0.045, 16, 64]} />
            <meshStandardMaterial color={palette.rim} roughness={0.3} />
          </mesh>
        </>
      )}
      {/* popcorn / foam / flaps */}
      {kind === "kernel" &&
        kernels.map((k, i) => (
          <group key={i} position={k.p} scale={k.s} rotation={[rand(i + 3) * 6, rand(i + 4) * 6, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.85, 20, 14]} />
              <meshStandardMaterial color={i % 6 === 0 ? "#F6D27E" : "#FFF5DC"} roughness={0.75} />
            </mesh>
            <mesh castShadow position={[0.55, 0.25, 0.1]}>
              <sphereGeometry args={[0.6, 16, 12]} />
              <meshStandardMaterial color="#FFF8E7" roughness={0.75} />
            </mesh>
            <mesh castShadow position={[-0.45, 0.35, -0.2]}>
              <sphereGeometry args={[0.55, 16, 12]} />
              <meshStandardMaterial color="#FFF1CF" roughness={0.75} />
            </mesh>
          </group>
        ))}
      {kind === "cup" && (
        <mesh castShadow position={[0, 1.24, 0]} scale={[1, 0.35, 1]}>
          <sphereGeometry args={[0.7, 32, 16]} />
          <meshStandardMaterial color="#F7EFE2" roughness={0.6} />
        </mesh>
      )}
      {kind === "box" && (
        <>
          <mesh castShadow position={[-0.55, 1.2, 0]} rotation={[0, 0, 0.6]}>
            <boxGeometry args={[0.7, 0.04, 1.1]} />
            <meshStandardMaterial color="#B07A3E" />
          </mesh>
          <mesh castShadow position={[0.55, 1.2, 0]} rotation={[0, 0, -0.6]}>
            <boxGeometry args={[0.7, 0.04, 1.1]} />
            <meshStandardMaterial color="#B07A3E" />
          </mesh>
        </>
      )}

      {/* face */}
      <group position={[0, 0, kind === "box" ? 0.56 : 0.62]}>
        {[-0.22, 0.22].map((x, i) => (
          <group key={i} position={[x, eyeY, 0]} scale={[1, blink, 1]}>
            <mesh>
              <sphereGeometry args={[0.15, 32, 32]} />
              <meshPhysicalMaterial {...white} clearcoat={1} />
            </mesh>
            <mesh position={[pupilOffset[0], pupilOffset[1], 0.11]}>
              <sphereGeometry args={[0.075, 24, 24]} />
              <meshStandardMaterial color="#111111" roughness={0.2} />
            </mesh>
            <mesh position={[pupilOffset[0] + 0.03, pupilOffset[1] + 0.035, 0.17]}>
              <sphereGeometry args={[0.022, 12, 12]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>
        ))}
        {mood === "cool" && (
          <group position={[0, eyeY + 0.02, 0.17]}>
            {[-0.22, 0.22].map((x) => (
              <mesh key={x} position={[x, 0, 0]}>
                <boxGeometry args={[0.36, 0.2, 0.05]} />
                <meshPhysicalMaterial color="#0b0b0b" roughness={0.05} metalness={0.4} clearcoat={1} />
              </mesh>
            ))}
            <mesh>
              <boxGeometry args={[0.12, 0.04, 0.04]} />
              <meshStandardMaterial color="#0b0b0b" />
            </mesh>
          </group>
        )}
        {/* brows */}
        {[-0.22, 0.22].map((x, i) => (
          <mesh key={`b${i}`} position={[x, eyeY + 0.22 + Math.abs(brow) * 0.08, 0.06]} rotation={[0, 0, (i ? -1 : 1) * brow]}>
            <capsuleGeometry args={[0.025, 0.16, 4, 8]} />
            <meshStandardMaterial color="#3B1F0E" />
          </mesh>
        ))}
        {/* mouth: dark ellipse + tongue, opens with audio */}
        <group position={[0, 0.36, 0.02]} rotation={[0, 0, Math.PI / 2]}>
          <mesh scale={[0.06 + mOpen * 0.17, mood === "cry" ? 0.16 : 0.2, 0.06]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color="#3A0A12" roughness={0.6} />
          </mesh>
          <mesh position={[-0.04 - mOpen * 0.05, 0, 0.03]} scale={[0.03 + mOpen * 0.06, 0.11, 0.04]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#FF6B81" />
          </mesh>
        </group>
        {/* cheeks */}
        {mood !== "cry" &&
          [-0.4, 0.4].map((x, i) => (
            <mesh key={`c${i}`} position={[x, 0.45, -0.02]} scale={[0.09, 0.05, 0.02]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color="#FF8FA3" transparent opacity={0.7} />
            </mesh>
          ))}
        {/* tears */}
        {mood === "cry" &&
          [-0.25, 0.25].map((x, i) => (
            <mesh key={`t${i}`} position={[x, eyeY - 0.18 - ((time * 0.8 + i * 0.4) % 0.5), 0.12]} scale={[0.04, 0.06, 0.04]}>
              <sphereGeometry args={[1, 12, 12]} />
              <meshPhysicalMaterial color="#7DD3FC" transmission={0.6} roughness={0.05} />
            </mesh>
          ))}
      </group>

      {/* arms */}
      {[
        { side: -1, a: arms.l },
        { side: 1, a: arms.r },
      ].map(({ side, a }) => (
        <group key={side} position={[side * 0.68, 0.55, 0.05]} rotation={[a[1], 0, a[0]]}>
          <mesh castShadow position={[0, -0.32, 0]}>
            <capsuleGeometry args={[0.07, 0.5, 6, 12]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
          </mesh>
          <mesh castShadow position={[0, -0.66, 0]}>
            <sphereGeometry args={[0.13, 20, 20]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.45} />
          </mesh>
        </group>
      ))}
      {/* legs */}
      {[-0.22, 0.22].map((x) => (
        <group key={x}>
          <mesh castShadow position={[x, -0.4, 0]}>
            <capsuleGeometry args={[0.07, 0.3, 6, 12]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh castShadow position={[x, -0.62, 0.08]} scale={[1, 0.6, 1.4]}>
            <sphereGeometry args={[0.14, 20, 16]} />
            <meshStandardMaterial color="#1F2937" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
