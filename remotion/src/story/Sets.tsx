import * as THREE from "three";
import type { StoryScene } from "./types";

export const SET_STYLE: Record<StoryScene["set"], { floor: string; fog: string; key: string; rim: string; hemi: [string, string, number]; sky: string }> = {
  campus: { floor: "#5E9E48", fog: "#BFE3FF", key: "#FFF4DD", rim: "#FFD9A0", hemi: ["#DFF1FF", "#3E6B2F", 1.0], sky: "#9ED3FF" },
  cafe: { floor: "#7A4E33", fog: "#3B2418", key: "#FFE2B8", rim: "#FF9F5A", hemi: ["#FFE7CC", "#3A2214", 0.85], sky: "#5A3A28" },
  room: { floor: "#4A3570", fog: "#170E2E", key: "#FFD7A8", rim: "#8B7DFF", hemi: ["#C9B8FF", "#1A1030", 0.7], sky: "#1C1238" },
  studio: { floor: "#24124A", fog: "#0E0726", key: "#FFFFFF", rim: "#22D3EE", hemi: ["#FFFFFF", "#2B1250", 0.85], sky: "#160B33" },
};

const wood = "#A0673F";
const dark = "#2A1E1A";

function Chair({ x, z = 0, rot }: { x: number; z?: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.06, 0.46]} />
        <meshStandardMaterial color={dark} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.82, -0.21]} castShadow>
        <boxGeometry args={[0.46, 0.62, 0.05]} />
        <meshStandardMaterial color={dark} roughness={0.5} />
      </mesh>
      {[-0.19, 0.19].flatMap((a) =>
        [-0.19, 0.19].map((b) => (
          <mesh key={`${a}${b}`} position={[a, 0.23, b]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.46, 8]} />
            <meshStandardMaterial color="#111" metalness={0.6} roughness={0.3} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Laptop({ position, rot, glow = "#7DD3FC" }: { position: [number, number, number]; rot: number; glow?: string }) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.44, 0.02, 0.3]} />
        <meshStandardMaterial color="#C9CED6" metalness={0.7} roughness={0.25} />
      </mesh>
      <group position={[0, 0.01, -0.15]} rotation={[-0.25, 0, 0]}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.44, 0.3, 0.015]} />
          <meshStandardMaterial color="#C9CED6" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.15, 0.009]}>
          <planeGeometry args={[0.4, 0.26]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.15, -0.009]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.03, 20]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 0.25, 0.25]} intensity={1.2} color={glow} distance={1.6} />
    </group>
  );
}

function Cup({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.04, 0.11, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[0.055, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.025, 0.008, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Cafe({ props }: { props: string[] }) {
  return (
    <>
      <group>
        <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.05, 40]} />
          <meshPhysicalMaterial color="#F3E9DC" roughness={0.25} clearcoat={0.6} />
        </mesh>
        <mesh position={[0, 0.38, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.74, 12]} />
          <meshStandardMaterial color="#111" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <cylinderGeometry args={[0.28, 0.3, 0.02, 24]} />
          <meshStandardMaterial color="#111" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      <Chair x={-0.82} rot={Math.PI / 2} />
      <Chair x={0.82} rot={-Math.PI / 2} />
      <Cup position={[-0.28, 0.84, 0.18]} color="#FF4FA3" />
      <Cup position={[0.3, 0.84, 0.2]} color="#22D3EE" />
      {props.includes("laptop") && <Laptop position={[0.12, 0.79, -0.05]} rot={-Math.PI / 2 + 0.35} />}
      {/* hanging lamps */}
      {[-1.4, 0, 1.4].map((x) => (
        <group key={x} position={[x, 3.1, -1.2]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 1.2, 4]} />
            <meshBasicMaterial color="#222" />
          </mesh>
          <mesh>
            <coneGeometry args={[0.22, 0.24, 24, 1, true]} />
            <meshStandardMaterial color="#1F2937" side={THREE.DoubleSide} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#FFE6B0" toneMapped={false} />
          </mesh>
          <pointLight position={[0, -0.2, 0]} intensity={3} color="#FFC983" distance={4} />
        </group>
      ))}
    </>
  );
}

function Room({ props }: { props: string[] }) {
  return (
    <>
      {props.includes("desk") && (
        <group position={[-0.55, 0, 0.25]}>
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.05, 0.55]} />
            <meshStandardMaterial color={wood} roughness={0.5} />
          </mesh>
          {[-0.5, 0.5].map((x) => (
            <mesh key={x} position={[x, 0.36, 0]} castShadow>
              <boxGeometry args={[0.05, 0.72, 0.5]} />
              <meshStandardMaterial color={wood} roughness={0.5} />
            </mesh>
          ))}
          <Laptop position={[0, 0.77, -0.02]} rot={Math.PI} glow="#A5F3FC" />
          <mesh position={[0.38, 0.86, 0.05]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.18, 16]} />
            <meshStandardMaterial color="#FFD23F" roughness={0.4} />
          </mesh>
          <Chair x={0} z={-0.6} rot={0} />
        </group>
      )}
      {props.includes("suitcase") && (
        <group position={[0.85, 0, 0.15]} rotation={[0, -0.5, 0]}>
          <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.66, 0.24]} />
            <meshPhysicalMaterial color="#FF4FA3" roughness={0.3} clearcoat={0.8} />
          </mesh>
          <mesh position={[0, 0.76, 0]}>
            <torusGeometry args={[0.08, 0.018, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {[-0.17, 0.17].map((x) => (
            <mesh key={x} position={[x, 0.03, 0.06]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 12]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          ))}
          <mesh position={[0.08, 0.45, 0.121]}>
            <circleGeometry args={[0.07, 20]} />
            <meshBasicMaterial color="#FFD23F" />
          </mesh>
        </group>
      )}
      {/* fairy lights */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-2.2 + i * 0.34, 2.9 + Math.sin(i * 0.9) * 0.12, -2.2]}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshBasicMaterial color={i % 2 ? "#FFE6B0" : "#FFB3D9"} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function Studio() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[2.0, 2.12, 64]} />
        <meshBasicMaterial color="#FFD23F" />
      </mesh>
    </>
  );
}

export function SetPieces({ set, props }: { set: StoryScene["set"]; props: string[] }) {
  if (set === "cafe") return <Cafe props={props} />;
  if (set === "room") return <Room props={props} />;
  if (set === "studio") return <Studio />;
  return null;
}

export function Floor({ color, glossy }: { color: string; glossy?: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.5]} receiveShadow>
      <planeGeometry args={[14, 13]} />
      {glossy ? <meshPhysicalMaterial color={color} roughness={0.2} clearcoat={1} /> : <meshStandardMaterial color={color} roughness={0.85} />}
    </mesh>
  );
}

export function Sky({ tex, color }: { tex?: THREE.Texture; color: string }) {
  return (
    <mesh position={[0, 3.2, -5]}>
      <planeGeometry args={[7.6, 13.5]} />
      {tex ? <meshBasicMaterial map={tex} toneMapped={false} fog={false} color="#d6d0dc" /> : <meshBasicMaterial color={color} fog={false} />}
    </mesh>
  );
}
