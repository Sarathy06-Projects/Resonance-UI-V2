import { ImageResponse } from "next/og";
import { getContentBySlug } from "@/lib/api/content";
import { resolveShortLink } from "@/lib/api/posts";
import { loadWordmark, Wordmark } from "@/lib/og/brand";

// 9:16 story card for Instagram Stories / WhatsApp Status.
//
// Laid out as a *card floating on a gradient*, not a full-bleed poster:
//
//  1. Instagram overlays its own chrome on the composer and the viewer - back
//     arrow and audio chip across the top, caption field and "Your story"
//     buttons across the bottom. Content spread edge to edge gets covered at
//     both ends, so everything stays inside SAFE_TOP/SAFE_BOTTOM.
//  2. A bordered card reads as "a post from somewhere else", which is the
//     thing being shared. Loose text on a background reads as a graphic.
//
// The destination URL is printed under the card because a story shared from a
// browser cannot carry a tappable link - only Instagram's link sticker can,
// and only the poster can add it. The share flow copies the same URL to the
// clipboard so it can be pasted there (see lib/share.ts).
export const runtime = "edge";

const WIDTH = 1080;
const HEIGHT = 1920;
// Instagram's own UI occupies roughly the top 13% and bottom 18% of the frame.
const SAFE_TOP = 260;
const SAFE_BOTTOM = 340;

const CARD_WIDTH = 880;
const CARD_PADDING = 56;
const INNER = CARD_WIDTH - CARD_PADDING * 2;
const GRID_GAP = 16;
// At most two thumbnails. More would push the card past the safe area, and
// Threads' own shared cards cap it here too.
const MAX_IMAGES = 2;

// Resolves either address a share can carry to the /@username/slug pair the
// content lookup needs: the canonical URL, or the short /p/:code alias that
// share sheets now hand out (see app/p/[code]/route.ts). Missing the short
// form here would silently render the generic fallback card for every share
// that used one - which is all of them.
async function resolveTarget(pathname: string): Promise<{ username: string; slug: string } | null> {
  const canonical = pathname.match(/^\/@([^/]+)\/([^/]+)$/);
  if (canonical) return { username: canonical[1], slug: canonical[2] };

  const short = pathname.match(/^\/p\/([^/]+)$/);
  if (short) {
    const target = await resolveShortLink(short[1]).catch(() => null);
    if (target?.username && target.slug) return { username: target.username, slug: target.slug };
  }

  return null;
}

function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  // Chunked: spreading a multi-hundred-KB array into String.fromCharCode in
  // one call blows the argument limit and throws.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Fetches a remote image and returns it as a data URI Satori can actually
 * draw.
 *
 * Satori - which next/og rasterises with - decodes PNG, JPEG and SVG only. It
 * has no WebP decoder and returns an *empty box* rather than an error, which
 * is why avatars and attachments first rendered as blank gaps: every upload in
 * this app is .webp, and the CDN won't transcode (neither ?format= nor an
 * Accept header changes what it serves).
 *
 * Next's own image optimizer will, though - /_next/image re-encodes to JPEG
 * when the request doesn't advertise WebP support. So the bytes are pulled
 * through that and inlined, which also pins the format instead of trusting
 * whatever Accept header Satori would have sent on its own.
 */
async function imageAsDataUri(origin: string, url: string | null | undefined, width: number): Promise<string | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const optimized = `${origin}/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=70`;
    const res = await fetch(optimized, {
      headers: { Accept: "image/jpeg,image/png" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;

    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!["image/jpeg", "image/png"].includes(type)) return null;

    return `data:${type};base64,${toBase64(await res.arrayBuffer())}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const raw = new URL(request.url).searchParams.get("url");

  let body = "";
  let author = "";
  let handle = "";
  let avatar: string | null = null;
  let images: string[] = [];
  let counts = { likes: 0, comments: 0, reposts: 0 };
  let displayUrl = "resonance.org.in";

  if (raw) {
    try {
      const target = new URL(raw);
      const full = `${target.host}${target.pathname}`;
      // Slugs come from a post's first ten words, so full paths routinely run
      // past 60 characters. This line is a cue that a link exists, not
      // something anyone retypes - the real URL goes to the clipboard.
      displayUrl = full.length > 44 ? `${full.slice(0, 44)}…` : full;

      const parsed = await resolveTarget(target.pathname);
      if (parsed) {
        const resolved = await getContentBySlug(parsed.username, parsed.slug).catch(() => null);
        if (resolved) {
          const who = resolved.type === "article" ? resolved.article.author : resolved.post.author;
          author = who.name;
          handle = who.username ? `@${who.username}` : "";

          const sources =
            resolved.type === "article"
              ? resolved.article.coverImage
                ? [resolved.article.coverImage]
                : []
              : (resolved.post.images ?? []);

          if (resolved.type === "article") {
            body = resolved.article.title;
            counts = {
              likes: resolved.article.likesCount ?? 0,
              comments: resolved.article.commentsCount ?? 0,
              reposts: 0,
            };
          } else {
            body = resolved.post.content;
            counts = {
              likes: resolved.post.likesCount ?? 0,
              comments: resolved.post.commentsCount ?? 0,
              reposts: resolved.post.sharesCount ?? 0,
            };
          }

          const picked = sources.slice(0, MAX_IMAGES);
          const thumbWidth = picked.length > 1 ? 640 : 828;

          // In parallel - these are the slowest part of the render, and a
          // story share is a foreground action someone is waiting on.
          const [resolvedAvatar, ...resolvedImages] = await Promise.all([
            imageAsDataUri(origin, who.image, 128),
            ...picked.map((src) => imageAsDataUri(origin, src, thumbWidth)),
          ]);
          avatar = resolvedAvatar;
          images = resolvedImages.filter((x): x is string => Boolean(x));
        }
      }
    } catch {
      // Malformed url param - fall through to the branded fallback card.
    }
  }

  const text = body.trim() || "Join the conversation on Resonance.";
  // Attachments take the room text would have used, so the excerpt tightens
  // when there are any - otherwise the card grows past the safe area.
  const limit = images.length > 0 ? 150 : 260;
  const excerpt = text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
  const initial = (author || "R").charAt(0).toUpperCase();
  // Some handles are auto-derived from an email address and are long enough
  // to push the name row out of the card on their own.
  const shownHandle = handle.length > 22 ? `${handle.slice(0, 22)}…` : handle;
  // Light artwork: this sits on the white card, not on the dark gradient
  // behind it. Same origin the attachments above were pulled through.
  const wordmark = await loadWordmark("light", origin);

  const thumbSize = images.length > 1 ? (INNER - GRID_GAP) / 2 : INNER;
  const thumbHeight = images.length > 1 ? thumbSize : 420;

  const actions: { d: string; count: number }[] = [
    {
      d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
      count: counts.likes,
    },
    { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z", count: counts.comments },
    {
      d: "M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3",
      count: counts.reposts,
    },
  ];

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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: CARD_WIDTH,
            borderRadius: 48,
            background: "#ffffff",
            padding: CARD_PADDING,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- Satori renders to a static PNG; next/image has no meaning here
              <img src={avatar} alt="" width={84} height={84} style={{ width: 84, height: 84, borderRadius: 42, objectFit: "cover" }} />
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
              <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#09090b" }}>{author || "Resonance"}</div>
              {shownHandle && <div style={{ display: "flex", fontSize: 30, color: "#71717a", marginTop: 6 }}>{shownHandle}</div>}
            </div>

            <Wordmark src={wordmark} height={34} color="#a1a1aa" />
          </div>

          <div style={{ display: "flex", fontSize: 38, lineHeight: 1.42, color: "#18181b" }}>{excerpt}</div>

          {images.length > 0 && (
            <div style={{ display: "flex", gap: GRID_GAP, marginTop: 32 }}>
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- see above
                <img
                  key={i}
                  src={src}
                  alt=""
                  width={thumbSize}
                  height={thumbHeight}
                  style={{ width: thumbSize, height: thumbHeight, borderRadius: 24, objectFit: "cover" }}
                />
              ))}
            </div>
          )}

          {/* Outlined glyphs with their counts, as Threads' shared card has -
              the numbers are what make it read as a post with a life of its
              own rather than a pull-quote. */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 36, gap: 40 }}>
            {actions.map(({ d, count }) => (
              <div key={d} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width={38} height={38} viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth={1.8}>
                  <path d={d} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {count > 0 && <div style={{ display: "flex", fontSize: 28, color: "#71717a" }}>{compactCount(count)}</div>}
              </div>
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
