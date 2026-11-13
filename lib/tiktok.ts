/**
 * Minimal TikTok Content Posting API client (photo carousels).
 * Docs: https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
 *
 * Required env vars:
 *   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET  - from your TikTok developer app
 *   TIKTOK_REFRESH_TOKEN                     - from /api/tiktok/connect (valid ~365 days)
 *   PUBLIC_BASE_URL (optional)               - defaults to https://fnt.diaspafra.org (must be a
 *                                              URL prefix verified in the TikTok dev portal)
 * Optional:
 *   TIKTOK_POST_MODE = "MEDIA_UPLOAD" (default: lands in your TikTok inbox as a draft
 *                      so you add music & tap Post) or "DIRECT_POST" (needs an audited app;
 *                      unaudited apps can only post privately).
 *   TIKTOK_PRIVACY   = privacy level for DIRECT_POST (default SELF_ONLY).
 */

const API = "https://open.tiktokapis.com/v2";

export const TIKTOK_SCOPES = "user.info.basic,video.upload,video.publish";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export async function exchangeCode(code: string, redirectUri: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

/** Channels that can be connected. "main" = @fundntech, "two" = the second TikTok channel. */
export const CHANNELS = { main: "TIKTOK_REFRESH_TOKEN", two: "TIKTOK_REFRESH_TOKEN_2" } as const;
export type Channel = keyof typeof CHANNELS;
export const asChannel = (v: string | null | undefined): Channel => (v === "two" ? "two" : "main");

export async function refreshAccessToken(channel: Channel = "main") {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: env(CHANNELS[channel]) });
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: env("TIKTOK_CLIENT_KEY"),
      client_secret: env("TIKTOK_CLIENT_SECRET"),
      ...params,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`TikTok token error: ${JSON.stringify(json)}`);
  }
  return json as { access_token: string; refresh_token: string; expires_in: number; open_id: string };
}

export async function postPhotoCarousel(opts: {
  accessToken: string;
  imageUrls: string[];
  title: string;
  description: string;
}) {
  const mode = process.env.TIKTOK_POST_MODE === "DIRECT_POST" ? "DIRECT_POST" : "MEDIA_UPLOAD";
  const post_info: Record<string, unknown> = {
    title: opts.title,
    description: opts.description,
  };
  if (mode === "DIRECT_POST") {
    post_info.privacy_level = process.env.TIKTOK_PRIVACY ?? "SELF_ONLY";
    post_info.disable_comment = false;
    post_info.auto_add_music = true;
  }

  const res = await fetch(`${API}/post/publish/content/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info,
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: opts.imageUrls,
      },
      post_mode: mode,
      media_type: "PHOTO",
    }),
  });
  const json = await res.json();
  if (!res.ok || (json.error && json.error.code !== "ok")) {
    throw new Error(`TikTok post error: ${JSON.stringify(json)}`);
  }
  return { mode, publishId: json.data?.publish_id as string | undefined };
}

/** Uses the user.info.basic scope to show which account is connected. */
export async function getUserInfo(accessToken: string) {
  const res = await fetch(`${API}/user/info/?fields=open_id,display_name,avatar_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  return (json.data?.user ?? {}) as { display_name?: string; avatar_url?: string };
}
