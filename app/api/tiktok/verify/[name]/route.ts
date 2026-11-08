/**
 * Serves TikTok's "URL properties" verification file without committing it.
 * Set TIKTOK_VERIFY_FILE (e.g. tiktokAbC123.txt) and TIKTOK_VERIFY_CONTENT (the file's text)
 * in Vercel; next.config.ts rewrites /tiktok*.txt here.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const file = process.env.TIKTOK_VERIFY_FILE;
  const content = process.env.TIKTOK_VERIFY_CONTENT;
  if (!file || !content || name !== file) return new Response("Not found", { status: 404 });
  return new Response(content, { headers: { "Content-Type": "text/plain" } });
}
