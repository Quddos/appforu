import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the slide fonts ship with the serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/slide/[id]/[n]": ["./assets/fonts/**", "./assets/f3d/**", "./assets/photos/**"],
    "/api/icon": ["./assets/fonts/**"],
    "/api/brand/[asset]": ["./assets/fonts/**", "./assets/f3d/**"],
  },
  async rewrites() {
    return [
      // TikTok domain verification file, e.g. /tiktokAbC123.txt (see app/api/tiktok/verify)
      { source: "/:name(tiktok[A-Za-z0-9_-]*\\.txt)", destination: "/api/tiktok/verify/:name" },
    ];
  },
};

export default nextConfig;
