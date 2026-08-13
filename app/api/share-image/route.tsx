import { ImageResponse } from "next/og";
import { getContentBySlug } from "@/lib/api/content";

// 9:16 story card for Instagram Stories / WhatsApp Status.
//
// Laid out as a *card floating on a gradient*, not a full-bleed poster. Two
// reasons, both learned from what the first version got wrong:
//
//  1. Instagram overlays its own chrome on the story composer and viewer -
//     a back arrow and audio chip across the top, caption field and "Your
//     story" buttons across the bottom. Content spread edge to edge gets
//     covered at both ends. Everything here stays inside SAFE_TOP/SAFE_BOTTOM.
//  2. A bordered card reads as "a post from somewhere else", which is the
//     thing being shared. Loose text on a background just reads as a graphic.
//
// The destination URL is printed under the card because a story shared from a
// browser cannot carry a tappable link - only Instagram's link sticker can,
// and only the poster can add it. The share flow copies the same URL to the
// clipboard so it can be pasted there (see lib/share.ts).
export const runtime = "edge";

const WIDTH = 1080;
const HEIGHT = 1920;
// Instagram's own UI occupies roughly the top 13% and bottom 18% of the
// frame. Keeping the card between these is what stops the wordmark from
// disappearing behind the audio chip.
const SAFE_TOP = 260;
const SAFE_BOTTOM = 340;

function parseSlugPath(pathname: string): { username: string; slug: string } | null {
  const match = pathname.match(/^\/@([^/]+)\/([^/]+)$/);
  return match ? { username: match[1], slug: match[2] } : null;
}

// Satori - which is what next/og rasterises with - decodes PNG, JPEG and SVG
// only. It has no WebP decoder, and hands back an empty box rather than an
// error when given one, which renders as a blank gap where the avatar should
// be. Uploaded avatars are currently all .webp (see the backend's upload
// pipeline), so in practice this falls through to the initial-letter circle
// until a PNG/JPEG variant is served alongside them.
//
// Fetching first also guards the other failure mode: Satori throws outright
// on an unfetchable src, which would fail the entire image rather than just
// the avatar.
const SATORI_DECODABLE = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

async function resolveAvatar(url: string | null | undefined): Promise<string | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    return SATORI_DECODABLE.includes(type) ? url : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");

  let body = "";
  let author = "";
  let handle = "";
  let avatar: string | null = null;
  let displayUrl = "resonance.org.in";

  if (raw) {
    try {
      const target = new URL(raw);
      const full = `${target.host}${target.pathname}`;
      // Slugs come from a post's first ten words, so full paths routinely run
      // past 60 characters. This line is a cue that a link exists, not
      // something anyone retypes - the real URL goes to the clipboard.
      displayUrl = full.length > 44 ? `${full.slice(0, 44)}…` : full;

      const parsed = parseSlugPath(target.pathname);
      if (parsed) {
        const resolved = await getContentBySlug(parsed.username, parsed.slug).catch(() => null);
        if (resolved) {
          const who = resolved.type === "article" ? resolved.article.author : resolved.post.author;
          body = resolved.type === "article" ? resolved.article.title : resolved.post.content;
          author = who.name;
          handle = who.username ? `@${who.username}` : "";
          avatar = await resolveAvatar(who.image);
        }
      }
    } catch {
      // Malformed url param - fall through to the branded fallback card.
    }
  }

  const text = body.trim() || "Join the conversation on Resonance.";
  // Cut rather than shrink: past this the type gets too small to read at
  // story size on a phone held at arm's length.
  const excerpt = text.length > 260 ? `${text.slice(0, 260).trimEnd()}…` : text;
  const initial = (author || "R").charAt(0).toUpperCase();
  // A long auto-generated handle (some are derived from an email address)
  // would otherwise push the name row out of the card.
  const shownHandle = handle.length > 22 ? `${handle.slice(0, 22)}…` : handle;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: SAFE_TOP,
          paddingBottom: SAFE_BOTTOM,
          background: "linear-gradient(160deg, #27272a 0%, #18181b 45%, #09090b 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* The card. White on a dark ground so it reads as a quoted object
            rather than as the background itself. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 880,
            borderRadius: 48,
            background: "#ffffff",
            padding: 56,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- Satori renders to a static PNG; next/image has no meaning here
              <img
                src={avatar}
                alt=""
                width={84}
                height={84}
                style={{ width: 84, height: 84, borderRadius: 42, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  background: "#18181b",
                  color: "#fafafa",
                  fontSize: 38,
                  fontWeight: 700,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {initial}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", marginLeft: 24, flex: 1 }}>
              <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#09090b" }}>
                {author || "Resonance"}
              </div>
              {shownHandle && (
                <div style={{ display: "flex", fontSize: 30, color: "#71717a", marginTop: 6 }}>{shownHandle}</div>
              )}
            </div>

            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 3, color: "#a1a1aa" }}>
              RESONANCE
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 40, lineHeight: 1.42, color: "#18181b" }}>{excerpt}</div>

          {/* Outlined action glyphs, as Threads' shared card has. They make
              the block read as a post rather than a pull-quote. */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 44, gap: 36 }}>
            {[
              "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
              "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
              "M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3",
              "M22 2 15 22l-4-9-9-4Z",
            ].map((d) => (
              <svg key={d} width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth={1.8}>
                <path d={d} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 48 }}>
          <div style={{ display: "flex", fontSize: 28, color: "#71717a", marginBottom: 12 }}>Read the full post</div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: "#e4e4e7" }}>{displayUrl}</div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        // Content is editable, so don't let a stale card outlive it for long -
        // but still cache, since a share is often retried.
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    }
  );
}
