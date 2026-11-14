/**
 * Render the story videos for the next days (data/videos.json) into MEDIA_DIR as <date>-<slot>.mp4,
 * then publish MEDIA_DIR as the single-commit "media" branch (old videos are pruned, so the
 * repository history does not grow). Run by .github/workflows/video.yml.
 *
 * Usage: npx tsx video/daily.ts [YYYY-MM-DD ...]     (default: the next three days)
 * Env:   MEDIA_DIR (a clone of the media branch), PUSH=1 to push after each video,
 *        TIME_BUDGET_MIN (stop starting new renders after this many minutes, default 300)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const mediaDir = path.resolve(process.env.MEDIA_DIR ?? path.join(root, "..", "media"));
const started = Date.now();
const budget = Number(process.env.TIME_BUDGET_MIN ?? 300) * 60_000;
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const dates = process.argv.slice(2).length ? process.argv.slice(2) : [day(1), day(2), day(3)];

type DayPlan = { f?: { id: string }; q1?: string; q2?: string };
const plan = JSON.parse(readFileSync(path.join(root, "data", "videos.json"), "utf8")) as Record<string, DayPlan>;
mkdirSync(mediaDir, { recursive: true });

function publish(note: string) {
  // keep yesterday onwards; older videos have already been sent to TikTok
  const cutoff = day(-1);
  for (const f of readdirSync(mediaDir)) if (/^\d{4}-\d{2}-\d{2}-/.test(f) && f.slice(0, 10) < cutoff) rmSync(path.join(mediaDir, f));
  if (process.env.PUSH !== "1") return;
  const git = (...a: string[]) => execFileSync("git", a, { cwd: mediaDir, stdio: "inherit" });
  // keep videos another run already published (the branch is rewritten on every push)
  try {
    execFileSync("git", ["fetch", "-q", "--depth", "1", "origin", "media"], { cwd: mediaDir, stdio: "ignore" });
    const remote = execFileSync("git", ["ls-tree", "--name-only", "FETCH_HEAD"], { cwd: mediaDir }).toString().split("\n").filter(Boolean);
    for (const f of remote) if (/^\d{4}-\d{2}-\d{2}-/.test(f) && f.slice(0, 10) >= cutoff && !existsSync(path.join(mediaDir, f))) git("checkout", "FETCH_HEAD", "--", f);
  } catch {
    /* no media branch yet */
  }
  git("checkout", "-q", "--orphan", "next");
  git("add", "-A");
  git("commit", "-q", "-m", `Story videos (${note})`);
  git("push", "-q", "-f", "origin", "next:media");
  try {
    git("branch", "-D", "media");
  } catch {
    /* first run */
  }
  git("branch", "-m", "media");
}

let made = 0;
for (const date of dates) {
  const p = plan[date];
  if (!p) {
    console.log(`No videos planned for ${date}`);
    continue;
  }
  const jobs: [string, string | undefined][] = [
    ["f", p.f?.id],
    ["q1", p.q1],
    ["q2", p.q2],
  ];
  for (const [slot, id] of jobs) {
    if (!id) continue;
    const out = path.join(mediaDir, `${date}-${slot}.mp4`);
    if (existsSync(out)) {
      console.log(`${path.basename(out)} already exists`);
      continue;
    }
    if (Date.now() - started > budget) {
      console.log("time budget used up; the next run continues");
      break;
    }
    console.log(`== ${date} ${slot}: ${id}`);
    try {
      execFileSync("npx", ["tsx", "render.ts", path.join(root, "video", "episodes", `${id}.json`), out], { stdio: "inherit", cwd: path.join(root, "remotion") });
      made++;
      publish(`${date}-${slot}`);
    } catch (e) {
      console.error(`render failed for ${id}`, e);
      rmSync(out, { force: true });
    }
  }
}
if (!made) publish("prune");
console.log(`rendered ${made} video(s)`);
