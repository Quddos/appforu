import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the slide fonts ship with the serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/slide/[id]/[n]": ["./assets/fonts/**"],
  },
};

export default nextConfig;
