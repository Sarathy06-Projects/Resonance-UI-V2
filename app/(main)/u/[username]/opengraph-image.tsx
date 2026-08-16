import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/api/users";
import { loadWordmark, Wordmark } from "@/lib/og/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { username: string } }) {
  const profile = await getProfile(params.username).catch(() => null);
  const name = profile?.name ?? params.username;
  const bio = profile?.bio ?? "";
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
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 32, color: "#a1a1aa" }}>@{params.username}</div>
          {bio && <div style={{ display: "flex", fontSize: 28, color: "#71717a", lineHeight: 1.4 }}>{bio.slice(0, 140)}</div>}
        </div>
      </div>
    ),
    { ...size }
  );
}
