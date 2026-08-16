import { ImageResponse } from "next/og";
import { getSeriesBySlug } from "@/lib/api/series";
import { loadWordmark, Wordmark } from "@/lib/og/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { username: string; slug: string } }) {
  const series = await getSeriesBySlug(params.username, params.slug).catch(() => null);
  // Dark artwork: the card's own background is #09090b.
  const wordmark = await loadWordmark("dark");

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
        <Wordmark src={wordmark} height={46} color="#71717a" />
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
