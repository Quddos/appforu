import { SITE_URL } from "@/lib/site";
import { cookies } from "next/headers";
import { exchangeCode } from "@/lib/tiktok";

/**
 * Step 2: TikTok redirects here with ?code=. We exchange it for tokens and show the
 * refresh token ONCE so you can paste it into the TIKTOK_REFRESH_TOKEN env var.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  if (!code || !state || state !== jar.get("tt_state")?.value) {
    return new Response("Invalid or expired login attempt. Start again at /api/tiktok/connect", { status: 400 });
  }
  const base = SITE_URL;
  try {
    const t = await exchangeCode(code, `${base}/api/tiktok/callback`);
    const html = `<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;padding:24px;max-width:640px">
<h2>TikTok connected ✅</h2>
<p>Copy this value into your hosting env var <b>TIKTOK_REFRESH_TOKEN</b>, then redeploy. Do not share it with anyone.</p>
<textarea readonly style="width:100%;height:120px">${t.refresh_token}</textarea>
<p>It stays valid for about a year. Reconnect here when it expires.</p></body>`;
    return new Response(html, { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
}
