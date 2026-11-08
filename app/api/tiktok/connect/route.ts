import { NextResponse } from "next/server";
import { TIKTOK_SCOPES } from "@/lib/tiktok";

/** Step 1 of connecting your TikTok account: redirect to TikTok's login/consent screen. */
export async function GET(req: Request) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) return new Response("Set TIKTOK_CLIENT_KEY first.", { status: 500 });
  const base = process.env.PUBLIC_BASE_URL ?? new URL(req.url).origin;
  const state = crypto.randomUUID();
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("scope", TIKTOK_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", `${base}/api/tiktok/callback`);
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url);
  res.cookies.set("tt_state", state, { httpOnly: true, secure: true, maxAge: 600, path: "/" });
  return res;
}
