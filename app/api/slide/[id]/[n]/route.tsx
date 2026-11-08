import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getOpportunity, SLIDES_PER_POST } from "@/lib/opportunities";
import { loadFonts, renderSlide, SLIDE_HEIGHT, SLIDE_WIDTH } from "@/lib/slides";

export const runtime = "nodejs";

/**
 * GET /api/slide/<id>/<n>.jpg  -> JPEG (TikTok photo posts accept JPEG/WEBP)
 * GET /api/slide/<id>/<n>.png  -> PNG
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await ctx.params;
  const match = /^(\d+)(?:\.(jpg|jpeg|png))?$/.exec(n);
  const index = match ? Number(match[1]) : NaN;
  const o = getOpportunity(id);
  if (!o || !match || index < 1 || index > SLIDES_PER_POST) {
    return new Response("Not found", { status: 404 });
  }

  const png = await new ImageResponse(renderSlide(o, index), {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: await loadFonts(),
  }).arrayBuffer();

  const wantPng = match[2] === "png";
  const body = wantPng ? Buffer.from(png) : await sharp(Buffer.from(png)).jpeg({ quality: 92 }).toBuffer();

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": wantPng ? "image/png" : "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
