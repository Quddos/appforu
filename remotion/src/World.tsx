import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";

/** Preload every texture an episode needs before the first frame (Remotion waits). */
export function usePreloadedTextures(paths: string[]) {
  const key = paths.join("|");
  const [map, setMap] = useState<Map<string, THREE.Texture> | null>(null);
  const [handle] = useState(() => delayRender("textures"));
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const unique = [...new Set(key.split("|").filter(Boolean))];
    Promise.all(
      unique.map(
        (p) =>
          new Promise<[string, THREE.Texture | null]>((res) =>
            loader.load(
              staticFile(p),
              (t) => {
                t.colorSpace = THREE.SRGBColorSpace;
                t.anisotropy = 8;
                res([p, t]);
              },
              undefined,
              () => res([p, null]),
            ),
          ),
      ),
    ).then((entries) => {
      const m = new Map<string, THREE.Texture>();
      for (const [p, t] of entries) if (t) m.set(p, t);
      setMap(m);
      continueRender(handle);
    });
  }, [key, handle]);
  return map;
}

export function CameraRig({ pos, look }: { pos: [number, number, number]; look: [number, number, number] }) {
  const { camera } = useThree();
  camera.position.set(...pos);
  camera.lookAt(...look);
  camera.updateProjectionMatrix();
  return null;
}

export function Lights({ accent }: { accent: string }) {
  return (
    <>
      <hemisphereLight args={["#ffffff", "#2b1250", 0.9]} />
      <directionalLight
        castShadow
        position={[3, 6, 5]}
        intensity={2.4}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-3, 2, 2]} intensity={18} color={accent} distance={10} />
      <pointLight position={[2.5, 1, -2]} intensity={14} color="#7DD3FC" distance={10} />
    </>
  );
}

export function Stage({ floorColor }: { floorColor: string }) {
  return (
    <group position={[0, -2.62, 0]}>
      {/* glossy round stage */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 64]} />
        <meshPhysicalMaterial color={floorColor} roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[2.6, 2.75, 0.24, 64]} />
        <meshStandardMaterial color="#1a0b33" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[2.45, 2.6, 64]} />
        <meshBasicMaterial color="#FFD23F" />
      </mesh>
    </group>
  );
}

export function Backdrop({ tex, tint }: { tex?: THREE.Texture; tint: string }) {
  return (
    <mesh position={[0, 0.2, -5]}>
      <planeGeometry args={[9.6, 17]} />
      {tex ? <meshBasicMaterial map={tex} toneMapped={false} fog={false} color="#d9d4e6" /> : <meshBasicMaterial color={tint} fog={false} />}
    </mesh>
  );
}

/** Floating 3D sprite (transparent PNG) with depth + gentle motion. */
export function Sprite({ tex, position, size, time, spin = 0, phase = 0 }: { tex?: THREE.Texture; position: [number, number, number]; size: number; time: number; spin?: number; phase?: number }) {
  if (!tex) return null;
  const y = Math.sin(time * 2 + phase) * 0.08;
  return (
    <mesh position={[position[0], position[1] + y, position[2]]} rotation={[0, Math.sin(time + phase) * 0.35, spin * time]} castShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={tex} transparent alphaTest={0.05} roughness={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

function rand(i: number) {
  const x = Math.sin(i * 91.7 + 13.1) * 43758.5453;
  return x - Math.floor(x);
}

/** Drifting glowing particles for depth. */
export function Particles({ time, color }: { time: number; color: string }) {
  const pts = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ x: (rand(i) - 0.5) * 7, y: (rand(i + 9) - 0.5) * 10, z: -4 + rand(i + 3) * 6, s: 0.02 + rand(i + 5) * 0.05, v: 0.15 + rand(i + 2) * 0.3 })), []);
  return (
    <>
      {pts.map((p, i) => (
        <mesh key={i} position={[p.x + Math.sin(time * 0.6 + i) * 0.15, ((p.y + time * p.v + 5) % 10) - 5, p.z]}>
          <sphereGeometry args={[p.s, 8, 8]} />
          <meshBasicMaterial color={i % 3 ? "#ffffff" : color} transparent opacity={0.55} />
        </mesh>
      ))}
    </>
  );
}

/** 3D confetti burst (deterministic physics). */
export function Confetti({ t }: { t: number }) {
  const bits = useMemo(
    () => Array.from({ length: 90 }, (_, i) => ({ vx: (rand(i) - 0.5) * 5, vy: 3 + rand(i + 1) * 4, vz: (rand(i + 2) - 0.5) * 3, c: ["#FFD23F", "#FF2E88", "#21E6C1", "#7DD3FC", "#ffffff"][i % 5], r: rand(i + 4) * 10 })),
    [],
  );
  if (t < 0) return null;
  return (
    <>
      {bits.map((b, i) => (
        <mesh key={i} position={[b.vx * t, -0.5 + b.vy * t - 4.9 * t * t * 0.6, b.vz * t + 1]} rotation={[b.r + t * 6, b.r * 2 + t * 4, 0]} castShadow>
          <boxGeometry args={[0.09, 0.05, 0.005]} />
          <meshStandardMaterial color={b.c} side={THREE.DoubleSide} roughness={0.4} />
        </mesh>
      ))}
    </>
  );
}
