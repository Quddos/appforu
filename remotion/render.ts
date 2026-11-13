/**
 * Render a BingeBrain episode with Remotion + React Three Fiber.
 * Usage: npx tsx render.ts <episode.json> <out.mp4>
 * Env:   PIPER, PIPER_VOICE, BROWSER (chrome executable, optional), REMOTION_GL (default "swangle"), CONCURRENCY
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import type { EpisodeProps, Scene, TimedScene } from "./src/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const pub = path.join(here, "public");
const FPS = 30;
const PIPER = process.env.PIPER ?? "piper";
const VOICE = process.env.PIPER_VOICE ?? "voices/en_US-ryan-high.onnx";

const sh = (cmd: string, args: string[], input?: string) => execFileSync(cmd, args, { input, stdio: [input ? "pipe" : "ignore", "pipe", "pipe"] });

function sfx() {
  const dir = path.join(pub, "sfx");
  mkdirSync(dir, { recursive: true });
  const make = (name: string, args: string[]) => {
    const out = path.join(dir, `${name}.wav`);
    if (!existsSync(out)) sh("ffmpeg", ["-y", "-v", "error", ...args, out]);
    return `sfx/${name}.wav`;
  };
  return {
    tick: make("tick", ["-f", "lavfi", "-i", "sine=frequency=1400:duration=0.06", "-af", "volume=0.6"]),
    ding: make("ding", ["-f", "lavfi", "-i", "sine=frequency=880:duration=0.8", "-f", "lavfi", "-i", "sine=frequency=1320:duration=0.8", "-filter_complex", "amix=inputs=2,afade=t=out:st=0.05:d=0.75,volume=1.4"]),
    whoosh: make("whoosh", ["-f", "lavfi", "-i", "anoisesrc=d=0.4:c=pink:a=0.5", "-af", "highpass=f=700,afade=t=in:d=0.18,afade=t=out:st=0.18:d=0.22,volume=0.5"]),
    pop: make("pop", ["-f", "lavfi", "-i", "sine=frequency=600:duration=0.08", "-af", "afade=t=out:st=0.01:d=0.07"]),
  };
}

/** Soft synth background loop (chord pad + light beat), generated with ffmpeg, no files to license. */
function music() {
  const out = path.join(pub, "sfx", "music.wav");
  if (!existsSync(out)) {
    const expr = "0.05*sin(2*PI*220*t)*(0.6+0.4*sin(2*PI*0.25*t))+0.04*sin(2*PI*277.18*t)+0.04*sin(2*PI*329.63*t)+0.08*sin(2*PI*55*t)*exp(-8*mod(t,0.5))";
    sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `aevalsrc=exprs='${expr}':s=44100:d=16`, "-af", "lowpass=f=2500", out]);
  }
  return "sfx/music.wav";
}

/** Mouth openness per video frame from the voice track (RMS, smoothed, 0..1). */
function envelope(wav: string): number[] {
  const raw = sh("ffmpeg", ["-v", "error", "-i", wav, "-ac", "1", "-ar", "24000", "-f", "s16le", "-"]);
  const samples = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 2));
  const per = 24000 / FPS;
  const out: number[] = [];
  for (let i = 0; i < samples.length; i += per) {
    let s = 0;
    const end = Math.min(samples.length, i + per);
    for (let j = i; j < end; j++) s += (samples[j] / 32768) ** 2;
    out.push(Math.sqrt(s / Math.max(1, end - i)));
  }
  const max = Math.max(0.0001, ...out);
  let prev = 0;
  return out.map((v) => (prev = prev * 0.35 + Math.min(1, (v / max) * 1.3) * 0.65));
}

function durationSec(file: string) {
  return Number(sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Painted backdrop from Pollinations' keyless endpoint, cached in assets/backdrops (falls back to a gradient). */
async function backdrop(prompt: string): Promise<string | undefined> {
  const cacheDir = path.join(root, "assets", "backdrops");
  mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, `${slug(prompt)}.jpg`);
  if (!existsSync(file)) {
    const full = `${prompt}, vibrant 3D animated movie style environment, soft volumetric light, no people, no text, depth of field`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=720&height=1280&seed=${slug(prompt).length * 97}&model=flux`;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const tmp = path.join(os.tmpdir(), `bd-${Date.now()}.jpg`);
        const code = sh("curl", ["-sSL", "--max-time", "120", "-o", tmp, "-w", "%{http_code} %{content_type}", url]).toString();
        if (code.startsWith("200 image/")) {
          // keep the top 93% (drops the corner badge; credited in the video instead) and fit 9:16
          sh("ffmpeg", ["-y", "-v", "error", "-i", tmp, "-vf", "crop=iw:ih*0.93:0:0,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=saturation=1.1", "-q:v", "3", file]);
          break;
        }
        console.warn(`backdrop ${code}, retrying`);
      } catch (e) {
        console.warn("backdrop fetch failed", String(e).slice(0, 200));
      }
      await new Promise((r) => setTimeout(r, 15_000));
    }
  }
  if (!existsSync(file)) return undefined;
  const dest = path.join(pub, "backdrops");
  mkdirSync(dest, { recursive: true });
  copyFileSync(file, path.join(dest, path.basename(file)));
  return `backdrops/${path.basename(file)}`;
}

const SERIES_BACKDROP = {
  brain: "cozy futuristic puzzle studio with neon teal lights and floating geometric shapes",
  comic: "colorful cartoon city street at golden hour",
  watch: "cozy home cinema room with purple ambient lights and a big screen",
};

async function main() {
  const [epFile, out] = process.argv.slice(2);
  if (!epFile || !out) throw new Error("usage: render.ts <episode.json> <out.mp4>");
  const ep = JSON.parse(readFileSync(epFile, "utf8")) as { id: string; series: EpisodeProps["series"]; title: string; scenes: Scene[] };

  // icons -> public/icons
  const icons = path.join(pub, "icons");
  mkdirSync(icons, { recursive: true });
  for (const f of readdirSync(path.join(root, "assets", "f3d"))) if (f.endsWith(".png")) copyFileSync(path.join(root, "assets", "f3d", f), path.join(icons, f));

  const epDir = path.join(pub, "ep", ep.id);
  mkdirSync(epDir, { recursive: true });
  const fx = sfx();
  const defaultBg = await backdrop(SERIES_BACKDROP[ep.series]);

  const scenes: TimedScene[] = [];
  let from = 0;
  for (const [i, sc] of ep.scenes.entries()) {
    let dur = 45;
    let audio: string | undefined;
    let env: number[] | undefined;
    if ("say" in sc && sc.say) {
      const wav = path.join(epDir, `v${i}.wav`);
      sh(PIPER, ["-m", VOICE, "-f", wav, "--length_scale", "0.92", "--sentence_silence", "0.12"], sc.say);
      audio = `ep/${ep.id}/v${i}.wav`;
      env = envelope(wav);
      dur = Math.ceil(durationSec(wav) * FPS) + 16;
    }
    if (sc.type === "countdown") dur = Math.max(dur, sc.seconds * FPS);
    if (sc.type === "reveal") dur += 30 + (sc.steps?.length ?? 0) * 12;
    if (sc.type === "puzzle") dur = Math.max(dur, sc.rows.length * 14 + 70);
    const bd = sc.type === "talk" && sc.set ? await backdrop(sc.set) : defaultBg;
    scenes.push({ ...sc, from, dur, audio, env, backdrop: bd } as TimedScene);
    from += dur;
  }

  const props: EpisodeProps = { id: ep.id, series: ep.series, title: ep.title, total: from, scenes, sfx: fx, music: music() };
  console.log(`${ep.id}: ${(from / FPS).toFixed(1)}s, ${from} frames`);

  const serveUrl = await bundle({ entryPoint: path.join(here, "src", "index.ts"), publicDir: pub });
  const chromiumOptions = { gl: (process.env.REMOTION_GL ?? "swangle") as "swangle" | "angle" | "egl" | "swiftshader" };
  const browserExecutable = process.env.BROWSER || undefined;
  const composition = await selectComposition({ serveUrl, id: "Episode", inputProps: props, chromiumOptions, browserExecutable });
  if (process.env.STILLS) {
    // preview mode: one still per scene (at 65% of the scene) into the folder given as <out>
    mkdirSync(out, { recursive: true });
    for (const [i, sc] of scenes.entries()) {
      const frame = sc.from + Math.floor(sc.dur * 0.65);
      await renderStill({ composition, serveUrl, frame, output: path.join(out, `s${i}-${sc.type}.png`), inputProps: props, chromiumOptions, browserExecutable, onBrowserLog: (l) => l.type !== 'log' && console.log('[browser]', l.type, l.text.slice(0, 300)) });
    }
    console.log(`stills in ${out}`);
    return;
  }
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 23,
    outputLocation: out,
    inputProps: props,
    chromiumOptions,
    browserExecutable,
    concurrency: Number(process.env.CONCURRENCY ?? Math.max(1, Math.floor(os.cpus().length / 2))),
    timeoutInMilliseconds: 120_000,
    ...(process.env.FRAME_RANGE ? { frameRange: process.env.FRAME_RANGE.split("-").map(Number) as [number, number] } : {}),
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) console.log(`  ${p * 10}%`), (last = p);
    },
  });
  console.log(`wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
