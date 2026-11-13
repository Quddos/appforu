import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the slide fonts ship with the serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/slide/[id]/[n]": ["./assets/fonts/**", "./assets/f3d/**", "./assets/photos/**"],
    "/api/icon": ["./assets/fonts/**"],
    "/api/brand/[asset]": ["./assets/fonts/**", "./assets/f3d/**"],
    "/videos": ["./video/episodes/**"],
  },
  async rewrites() {
    return [
      // TikTok domain verification file, e.g. /tiktokAbC123.txt (see app/api/tiktok/verify)
      { source: "/:name(tiktok[A-Za-z0-9_-]*\\.txt)", destination: "/api/tiktok/verify/:name" },
      // Story videos live on the rolling "media" branch (keeps big files out of the main history);
      // served from our verified domain so TikTok can pull them.
      { source: "/media/:file", destination: "https://raw.githubusercontent.com/Quddos/appforu/media/:file" },
    ];
  },
  async headers() {
    return [{ source: "/media/:file", headers: [{ key: "Content-Type", value: "video/mp4" }, { key: "Cache-Control", value: "public, max-age=300" }] }];
  },
};

export default nextConfig;
