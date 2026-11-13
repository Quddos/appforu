/**
 * Usage:  npx tsx video/make.ts <episode.json> <out.mp4>
 * Env:    PIPER=path/to/piper  PIPER_VOICE=path/to/voice.onnx  JOBS=4
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { FPS, frame, renderPng, type Episode, type Scene } from "./engine";

const PIPER = process.env.PIPER ?? "piper";
const VOICE = process.env.PIPER_VOICE ?? "voices/en_US-ryan-high.onnx";
const JOBS = Number(process.env.JOBS ?? Math.max(1, os.cpus().length));

type Timed = { sc: Scene; start: number; dur: number; wav?: string };

function duration(file: string) {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
}

function tts(text: string, out: string) {
  execFileSync(PIPER, ["-m", VOICE, "-f", out, "--length_scale", "0.9", "--sentence_silence", "0.15"], { input: text, stdio: ["pipe", "ignore", "ignore"] });
}

function sfx(dir: string) {
  const f = (name: string, args: string[]) => {
    const out = path.join(dir, `${name}.wav`);
    execFileSync("ffmpeg", ["-y", "-v", "error", ...args, out]);
    return out;
  };
  return {
    tick: f("tick", ["-f", "lavfi", "-i", "sine=frequency=1400:duration=0.06", "-af", "volume=0.6"]),
    ding: f("ding", ["-f", "lavfi", "-i", "sine=frequency=880:duration=0.7", "-f", "lavfi", "-i", "sine=frequency=1320:duration=0.7", "-filter_complex", "amix=inputs=2,afade=t=out:st=0.05:d=0.65,volume=1.4"]),
    whoosh: f("whoosh", ["-f", "lavfi", "-i", "anoisesrc=d=0.35:c=pink:a=0.5", "-af", "highpass=f=800,afade=t=in:d=0.15,afade=t=out:st=0.15:d=0.2,volume=0.5"]),
  };
}

async function renderRange(ep: Episode, timeline: Timed[], from: number, to: number, dir: string) {
  for (let f = from; f < to; f++) {
    const g = f / FPS;
    const cur = timeline.find((x) => g >= x.start && g < x.start + x.dur) ?? timeline[timeline.length - 1];
    const png = await renderPng(frame(ep, cur.sc, g - cur.start, cur.dur, g));
    writeFileSync(path.join(dir, `f${String(f).padStart(5, "0")}.png`), png);
  }
}

async function main() {
  // worker mode: render a slice of frames
  if (process.argv[2] === "--worker") {
    const [, , , epFile, tlFile, from, to, dir] = process.argv;
    await renderRange(JSON.parse(readFileSync(epFile, "utf8")), JSON.parse(readFileSync(tlFile, "utf8")), Number(from), Number(to), dir);
    return;
  }

  const [epFile, out] = process.argv.slice(2);
  if (!epFile || !out) throw new Error("usage: make.ts <episode.json> <out.mp4>");
  const ep: Episode = JSON.parse(readFileSync(epFile, "utf8"));
  const work = path.join(os.tmpdir(), `bb-${ep.id}-${Date.now()}`);
  const frames = path.join(work, "frames");
  mkdirSync(frames, { recursive: true });
  const fx = sfx(work);

  // 1. voice-over + timeline
  const timeline: Timed[] = [];
  let t = 0;
  ep.scenes.forEach((sc, i) => {
    let dur: number;
    let wav: string | undefined;
    if ("say" in sc && sc.say) {
      wav = path.join(work, `v${i}.wav`);
      tts(sc.say, wav);
      dur = duration(wav) + 0.45;
    } else dur = 1.5;
    if (sc.type === "countdown") dur = Math.max(dur, sc.seconds);
    if (sc.type === "reveal") dur += 1.2 + (sc.steps?.length ?? 0) * 0.5;
    if (sc.type === "puzzle") dur = Math.max(dur, sc.rows.length * 0.6 + 2.5);
    timeline.push({ sc, start: t, dur, wav });
    t += dur;
  });
  const total = t;
  const nFrames = Math.ceil(total * FPS);
  console.log(`${ep.id}: ${total.toFixed(1)}s, ${nFrames} frames, ${JOBS} workers`);

  // 2. frames in parallel worker processes
  const epPath = path.join(work, "ep.json");
  const tlPath = path.join(work, "tl.json");
  writeFileSync(epPath, JSON.stringify(ep));
  writeFileSync(tlPath, JSON.stringify(timeline));
  const per = Math.ceil(nFrames / JOBS);
  await Promise.all(
    Array.from({ length: JOBS }, (_, j) => {
      const from = j * per, to = Math.min(nFrames, from + per);
      if (from >= to) return Promise.resolve();
      return new Promise<void>((res, rej) => {
        const p = spawn(process.execPath, [...process.execArgv, __filename, "--worker", epPath, tlPath, String(from), String(to), frames], { stdio: "inherit" });
        p.on("exit", (c) => (c === 0 ? res() : rej(new Error(`worker ${j} exited ${c}`))));
      });
    }),
  );

  // 3. audio: voice clips + sound effects at their times
  const inputs: string[] = [];
  const parts: string[] = [];
  const add = (file: string, at: number, vol = 1) => {
    const k = inputs.length / 2;
    inputs.push("-i", file);
    parts.push(`[${k}]adelay=${Math.round(at * 1000)}|${Math.round(at * 1000)},volume=${vol}[a${k}]`);
  };
  timeline.forEach((x) => {
    add(fx.whoosh, x.start, 0.8);
    if (x.wav) add(x.wav, x.start + 0.15, 1.6);
    if (x.sc.type === "countdown") for (let s = 0; s < x.sc.seconds; s++) add(fx.tick, x.start + s);
    if (x.sc.type === "reveal") add(fx.ding, x.start + 0.5);
  });
  const n = inputs.length / 2;
  const audio = path.join(work, "mix.wav");
  execFileSync("ffmpeg", [
    "-y", "-v", "error", ...inputs,
    "-filter_complex", `${parts.join(";")};${Array.from({ length: n }, (_, k) => `[a${k}]`).join("")}amix=inputs=${n}:normalize=0,apad=whole_dur=${total.toFixed(2)},alimiter=limit=0.9[out]`,
    "-map", "[out]", "-t", total.toFixed(2), audio,
  ]);

  // 4. encode
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%05d.png"), "-i", audio,
    "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-r", "30",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", out,
  ]);
  if (existsSync(work)) rmSync(work, { recursive: true, force: true });
  console.log(`wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
