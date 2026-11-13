/**
 * Render today's (UTC) episode from data/videos.json into public/videos/<date>.mp4
 * and delete videos older than 7 days. Run by .github/workflows/video.yml.
 * Usage: npx tsx video/daily.ts [YYYY-MM-DD]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const plan = JSON.parse(readFileSync(path.join(root, "data", "videos.json"), "utf8")) as Record<string, string>;
const outDir = path.join(root, "public", "videos");
mkdirSync(outDir, { recursive: true });

// prune old videos (keep 7 days)
const cutoff = new Date(Date.parse(`${date}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10);
for (const f of readdirSync(outDir)) {
  const d = f.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}\.mp4$/.test(f) && d < cutoff) rmSync(path.join(outDir, f));
}

const id = plan[date];
if (!id) {
  console.log(`No episode scheduled for ${date}`);
  process.exit(0);
}
const out = path.join(outDir, `${date}.mp4`);
if (existsSync(out)) {
  console.log(`${out} already exists`);
  process.exit(0);
}
execFileSync("npx", ["tsx", path.join(root, "video", "make.ts"), path.join(root, "video", "episodes", `${id}.json`), out], { stdio: "inherit" });
