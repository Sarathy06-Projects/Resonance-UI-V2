import { ImageResponse } from "next/og";
import { getContentBySlug } from "@/lib/api/content";
import { loadWordmark, Wordmark } from "@/lib/og/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { username: string; slug: string } }) {
  const resolved = await getContentBySlug(params.username, params.slug).catch(() => null);

  const title = resolved
    ? resolved.type === "article"
      ? resolved.article.title
      : resolved.post.content.split("\n")[0].slice(0, 120)
    : "Resonance";
  const authorName = resolved ? (resolved.type === "article" ? resolved.article.author.name : resolved.post.author.name) : "";
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
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
        {authorName && <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa" }}>{authorName}</div>}
      </div>
    ),
    { ...size }
  );
}
