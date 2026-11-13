import { ImageResponse } from "next/og";
import { BrandSheet, loadBrandIcons, Logo, SeriesCover, type SeriesKey } from "@/lib/brand";
import { loadFonts } from "@/lib/slides";

export const runtime = "nodejs";

/** /api/brand/logo.png · /api/brand/sheet.png · /api/brand/cover-comic.png | cover-watch | cover-brain */
export async function GET(_req: Request, ctx: { params: Promise<{ asset: string }> }) {
  const { asset } = await ctx.params;
  const name = asset.replace(/\.png$/, "");
  await loadBrandIcons();
  const fonts = await loadFonts();
  if (name === "logo") return new ImageResponse(<Logo />, { width: 1080, height: 1080, fonts });
  if (name === "sheet") return new ImageResponse(<BrandSheet />, { width: 1920, height: 1080, fonts });
  const m = /^cover-(comic|watch|brain)$/.exec(name);
  if (m) return new ImageResponse(<SeriesCover k={m[1] as SeriesKey} />, { width: 1080, height: 1920, fonts });
  return new Response("Not found", { status: 404 });
}
