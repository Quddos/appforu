import { SITE_URL } from "@/lib/site";
import { captionFor, postsForDate, SLIDES_PER_POST } from "@/lib/opportunities";
import { postPhotoCarousel, refreshAccessToken, sendVideoToInbox } from "@/lib/tiktok";
import videos from "@/data/videos.json";

export const dynamic = "force-dynamic";

/**
 * Called by Vercel Cron (see vercel.json) — once per slot, twice a day.
 * GET /api/cron/post?slot=0  -> today's first post
 * GET /api/cron/post?slot=1  -> today's second post
 * Add &dry=1 to see what would be posted without calling TikTok.
 * For a manual test from a browser, add &secret=<CRON_SECRET>.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const authorized =
    !!secret &&
    (req.headers.get("authorization") === `Bearer ${secret}` || url.searchParams.get("secret") === secret);
  console.log(`[cron] ${url.pathname}${url.search.replace(/secret=[^&]*/, "secret=***")} authorized=${authorized}`);
  if (!authorized) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const slot = Number(url.searchParams.get("slot") ?? 0);
  // Second channel (BingeBrain on @qomment.chat): today's video goes out with the evening slot,
  // or on demand with ?video=1.
  if (url.searchParams.get("video") === "1") return Response.json(await postDailyVideo(url));
  const video = slot === 1 && url.searchParams.get("dry") !== "1" ? postDailyVideo(url) : null;
  const o = postsForDate()[slot];
  if (!o) return Response.json({ error: "no verified opportunity for this slot" }, { status: 404 });

  const base = SITE_URL;
  const imageUrls = Array.from({ length: SLIDES_PER_POST }, (_, i) => `${base}/api/slide/${o.id}/${i + 1}.jpg`);
  const caption = captionFor(o);

  if (url.searchParams.get("dry") === "1") {
    return Response.json({ dryRun: true, id: o.id, imageUrls, caption });
  }

  try {
    const token = await refreshAccessToken();
    const result = await postPhotoCarousel({ accessToken: token.access_token, imageUrls, ...caption });
    console.log(`[cron] posted ${o.id}`, JSON.stringify(result));
    return Response.json({ ok: true, id: o.id, ...result, video: await video });
  } catch (e) {
    console.error(`[cron] FAILED ${o.id}`, e);
    return Response.json({ ok: false, id: o.id, error: String(e), video: await video }, { status: 502 });
  }
}

async function postDailyVideo(url: URL) {
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const episode = (videos as Record<string, string>)[date];
  if (!episode) return { video: "none scheduled", date };
  const videoUrl = `${SITE_URL}/videos/${date}.mp4`;
  const head = await fetch(videoUrl, { method: "HEAD" }).catch(() => null);
  if (!head?.ok) {
    console.error(`[cron] video missing ${videoUrl}`);
    return { video: "not rendered yet", videoUrl };
  }
  try {
    const token = await refreshAccessToken("two");
    const result = await sendVideoToInbox(token.access_token, videoUrl);
    console.log(`[cron] video sent ${episode}`, JSON.stringify(result));
    return { video: "sent", episode, ...result };
  } catch (e) {
    console.error(`[cron] VIDEO FAILED ${episode}`, e);
    return { video: "failed", episode, error: String(e) };
  }
}
