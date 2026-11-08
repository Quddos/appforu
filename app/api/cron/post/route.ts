import { captionFor, postsForDate, SLIDES_PER_POST } from "@/lib/opportunities";
import { postPhotoCarousel, refreshAccessToken } from "@/lib/tiktok";

export const dynamic = "force-dynamic";

/**
 * Called by Vercel Cron (see vercel.json) — once per slot, twice a day.
 * GET /api/cron/post?slot=0  -> today's first post
 * GET /api/cron/post?slot=1  -> today's second post
 * Add &dry=1 to see what would be posted without calling TikTok.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const slot = Number(url.searchParams.get("slot") ?? 0);
  const o = postsForDate()[slot];
  if (!o) return Response.json({ error: "no verified opportunity for this slot" }, { status: 404 });

  const base = process.env.PUBLIC_BASE_URL ?? url.origin;
  const imageUrls = Array.from({ length: SLIDES_PER_POST }, (_, i) => `${base}/api/slide/${o.id}/${i + 1}.jpg`);
  const caption = captionFor(o);

  if (url.searchParams.get("dry") === "1") {
    return Response.json({ dryRun: true, id: o.id, imageUrls, caption });
  }

  try {
    const token = await refreshAccessToken();
    const result = await postPhotoCarousel({ accessToken: token.access_token, imageUrls, ...caption });
    return Response.json({ ok: true, id: o.id, ...result });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, id: o.id, error: String(e) }, { status: 502 });
  }
}
