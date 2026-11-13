import { SITE_URL } from "@/lib/site";
import { captionFor, postsForDate, SLIDES_PER_POST, type Opportunity } from "@/lib/opportunities";
import { postPhotoCarousel, refreshAccessToken, sendVideoToInbox, type Channel } from "@/lib/tiktok";
import videos from "@/data/videos.json";

export const dynamic = "force-dynamic";

type DayPlan = { f?: { id: string; opportunity?: string }; q1?: string; q2?: string };

/**
 * Called by Vercel Cron (see vercel.json), twice a day.
 * slot=0 (afternoon): @fundntech story video (falls back to a carousel if the video is missing)
 *                     + @qomment.chat story video 1
 * slot=1 (night):     @fundntech carousel for the day's other opportunity
 *                     + @qomment.chat story video 2
 * Add &dry=1 to see what would happen without calling TikTok, &date=YYYY-MM-DD to pick a day,
 * &only=fundintech|qomment to run one channel. For a manual test, add &secret=<CRON_SECRET>.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const authorized =
    !!secret &&
    (req.headers.get("authorization") === `Bearer ${secret}` || url.searchParams.get("secret") === secret);
  console.log(`[cron] ${url.pathname}${url.search.replace(/secret=[^&]*/, "secret=***")} authorized=${authorized}`);
  if (!authorized) return Response.json({ error: "unauthorized" }, { status: 401 });

  const slot = Number(url.searchParams.get("slot") ?? 0) === 1 ? 1 : 0;
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const dry = url.searchParams.get("dry") === "1";
  const only = url.searchParams.get("only");
  const plan = ((videos as Record<string, unknown>)[date] ?? {}) as DayPlan;

  const [fundintech, qomment] = await Promise.all([
    only === "qomment" ? null : runFundInTech(slot, date, plan, dry),
    only === "fundintech" ? null : sendVideo("two", date, slot === 0 ? "q1" : "q2", plan[slot === 0 ? "q1" : "q2"], dry),
  ]);
  const ok = (fundintech?.ok ?? true) && (qomment?.ok ?? true);
  return Response.json({ ok, slot, date, fundintech, qomment }, { status: ok ? 200 : 502 });
}

async function runFundInTech(slot: 0 | 1, date: string, plan: DayPlan, dry: boolean) {
  const posts = postsForDate(new Date(`${date}T12:00:00Z`));
  const videoOpp = plan.f?.opportunity;
  if (slot === 0) {
    if (plan.f) {
      const v = await sendVideo("main", date, "f", plan.f.id, dry);
      if (v.ok) return v;
    }
    const o = posts.find((p) => p.id === videoOpp) ?? posts[0];
    return o ? carousel(o, dry) : { ok: false, error: "no verified opportunity" };
  }
  const first = videoOpp ?? posts[0]?.id;
  const o = posts.find((p) => p.id !== first) ?? posts[1];
  return o ? carousel(o, dry) : { ok: false, error: "no verified opportunity" };
}

async function carousel(o: Opportunity, dry: boolean) {
  const imageUrls = Array.from({ length: SLIDES_PER_POST }, (_, i) => `${SITE_URL}/api/slide/${o.id}/${i + 1}.jpg`);
  const caption = captionFor(o);
  if (dry) return { ok: true, dryRun: true, carousel: o.id, imageUrls, caption };
  try {
    const token = await refreshAccessToken();
    const result = await postPhotoCarousel({ accessToken: token.access_token, imageUrls, ...caption });
    console.log(`[cron] posted ${o.id}`, JSON.stringify(result));
    return { ok: true, carousel: o.id, ...result };
  } catch (e) {
    console.error(`[cron] FAILED ${o.id}`, e);
    return { ok: false, carousel: o.id, error: String(e) };
  }
}

async function sendVideo(channel: Channel, date: string, slot: string, episode: string | undefined, dry: boolean) {
  if (!episode) return { ok: true, video: "none scheduled" };
  const videoUrl = `${SITE_URL}/media/${date}-${slot}.mp4`;
  const head = await fetch(videoUrl, { method: "HEAD" }).catch(() => null);
  if (!head?.ok) {
    console.error(`[cron] video missing ${videoUrl}`);
    return { ok: false, video: "not rendered yet", episode, videoUrl };
  }
  if (dry) return { ok: true, dryRun: true, video: episode, videoUrl, bytes: head.headers.get("content-length") };
  try {
    const token = await refreshAccessToken(channel);
    const result = await sendVideoToInbox(token.access_token, videoUrl);
    console.log(`[cron] video sent ${channel} ${episode}`, JSON.stringify(result));
    return { ok: true, video: "sent", episode, ...result };
  } catch (e) {
    console.error(`[cron] VIDEO FAILED ${channel} ${episode}`, e);
    return { ok: false, video: "failed", episode, error: String(e) };
  }
}
