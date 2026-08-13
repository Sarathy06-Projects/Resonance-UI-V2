import { ImageResponse } from "next/og";
import { getContentBySlug } from "@/lib/api/content";

// 9:16 story card, sized for Instagram Stories / WhatsApp Status.
//
// The destination URL is rendered *into* the image on purpose. A story shared
// from a web app cannot carry a tappable link - only Instagram's own link
// sticker can do that, and only the person posting can add it - so printing
// the URL is the one way the destination survives at all. The share flow
// copies the same URL to the clipboard at the same time (see lib/share.ts) so
// it can be pasted straight into that sticker.
export const runtime = "edge";

const WIDTH = 1080;
const HEIGHT = 1920;

// Parses /@username/slug out of the canonical share URL. Anything else - a
// /post/:id permalink, a topic page - has no per-item card, so the caller
// gets the branded fallback rather than an error.
function parseSlugPath(pathname: string): { username: string; slug: string } | null {
  const match = pathname.match(/^\/@([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { username: match[1], slug: match[2] };
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");

  let title = "Resonance";
  let author = "";
  let displayUrl = "resonance.org.in";

  if (raw) {
    try {
      const target = new URL(raw);
      // Slugs are derived from the first ten words of a post, so the full
      // path routinely runs past 60 characters and wraps to three cramped
      // lines down here. Cap it: this line is a cue that a link exists, not
      // something anyone retypes - the share flow puts the real URL on the
      // clipboard for the link sticker.
      const full = `${target.host}${target.pathname}`;
      displayUrl = full.length > 46 ? `${full.slice(0, 46)}…` : full;

      const parsed = parseSlugPath(target.pathname);
      if (parsed) {
        const resolved = await getContentBySlug(parsed.username, parsed.slug).catch(() => null);
        if (resolved) {
          title =
            resolved.type === "article"
              ? resolved.article.title
              : resolved.post.content.split("\n").filter(Boolean)[0] ?? resolved.post.content;
          author = resolved.type === "article" ? resolved.article.author.name : resolved.post.author.name;
        }
      }
    } catch {
      // Malformed url param - fall through to the branded fallback card.
    }
  }

  // Long posts get cut rather than shrunk: past this the type would be too
  // small to read at story size on a phone held at arm's length.
  const body = title.length > 220 ? `${title.slice(0, 220).trimEnd()}…` : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 96,
          background: "linear-gradient(160deg, #18181b 0%, #09090b 55%, #000000 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700, letterSpacing: 6, color: "#a1a1aa" }}>
          RESONANCE
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {author && (
            <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#a1a1aa", marginBottom: 32 }}>
              {author}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.25 }}>{body}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", height: 2, width: "100%", background: "#27272a", marginBottom: 36 }} />
          <div style={{ display: "flex", fontSize: 34, color: "#71717a", marginBottom: 12 }}>Read the full post</div>
          <div style={{ display: "flex", fontSize: 38, fontWeight: 600, color: "#fafafa" }}>{displayUrl}</div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        // Content can be edited, so don't let a stale card outlive it for
        // long; still worth caching, since a share often retries.
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    }
  );
}
