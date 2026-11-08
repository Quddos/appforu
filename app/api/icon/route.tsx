import { ImageResponse } from "next/og";
import { loadFonts } from "@/lib/slides";

export const runtime = "nodejs";

/** 1024x1024 app icon (for the TikTok developer portal). */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1024,
          height: 1024,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "linear-gradient(160deg, #050b1f 0%, #0b1d4a 60%, #062a3a 100%)",
          color: "#fff",
        }}
      >
        <div
          style={{
            width: 640,
            height: 640,
            borderRadius: 640,
            border: "28px solid #19d3c5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Anton",
            fontSize: 360,
            color: "#19d3c5",
          }}
        >
          FT
        </div>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 96, marginTop: 40, letterSpacing: 4 }}>
          FUND IN TECH
        </div>
      </div>
    ),
    { width: 1024, height: 1024, fonts: await loadFonts() },
  );
}
