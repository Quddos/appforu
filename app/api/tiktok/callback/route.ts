import { SITE_URL } from "@/lib/site";
import { cookies } from "next/headers";
import { asChannel, CHANNELS, exchangeCode, getUserInfo } from "@/lib/tiktok";

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

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
  const channel = asChannel(jar.get("tt_channel")?.value);
  const envName = CHANNELS[channel];
  try {
    const t = await exchangeCode(code, `${base}/api/tiktok/callback`);
    const user = await getUserInfo(t.access_token).catch(() => ({}) as { display_name?: string; avatar_url?: string });
    const name = esc(user.display_name ?? "your account");
    const avatar = user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="" width="72" height="72" style="border-radius:50%">` : "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TikTok connected | FundInTech</title></head>
<body style="font-family:system-ui,sans-serif;background:#020617;color:#e2e8f0;padding:32px 16px;margin:0">
<div style="max-width:560px;margin:0 auto">
<h1 style="margin:0 0 20px">TikTok connected ✅</h1>
<div style="display:flex;align-items:center;gap:16px;background:#0f172a;border:1px solid #334155;border-radius:16px;padding:16px">
${avatar}<div><div style="color:#94a3b8;font-size:14px">Connected account</div><div style="font-size:22px;font-weight:700">${name}</div></div></div>
<p>${channel === "main" ? "FundInTech will send 2 photo carousels a day to this account." : "This is your second channel. Posts for it will be sent here."}</p>
<p><a href="/studio" style="color:#2dd4bf">Open Post Studio →</a></p>
<details style="margin-top:28px;color:#94a3b8"><summary style="cursor:pointer">Setup token (owner only)</summary>
<p>Copy this into the <b>${envName}</b> setting in Vercel, then redeploy. Never share it.</p>
<textarea readonly style="width:100%;height:110px">${esc(t.refresh_token)}</textarea></details>
</div></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
}
