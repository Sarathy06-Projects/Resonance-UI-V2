import { ImageResponse } from "next/og";
import { getSeriesBySlug } from "@/lib/api/series";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { username: string; slug: string } }) {
  const series = await getSeriesBySlug(params.username, params.slug).catch(() => null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#09090b",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#71717a" }}>RESONANCE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: 2 }}>
            {series ? `${series.articlesCount} PART SERIES` : "SERIES"}
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>{series?.title ?? "Resonance"}</div>
          {series?.author.name && <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa" }}>{series.author.name}</div>}
        </div>
      </div>
    ),
    { ...size }
  );
}
