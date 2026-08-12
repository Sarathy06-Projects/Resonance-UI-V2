// Single source of truth for every internal content URL. Introduced
// alongside the /@username/slug migration specifically so the ~15 call
// sites that used to build hrefs from ad hoc template literals (each with
// its own, sometimes inconsistent, null-username handling) become one-line
// swaps to these functions instead - and so the URL scheme never has to be
// hand-updated in more than one place again if it ever changes.
//
// Pure functions, no "use client" - safe to import from Server Components,
// generateMetadata, and Client Components alike.

export function profileUrl(user: { username: string | null }): string {
  return user.username ? `/@${user.username}` : "#";
}

export function articleUrl(article: { slug: string; author: { username: string | null } }): string {
  return article.author.username ? `/@${article.author.username}/${article.slug}` : "#";
}

// Falls back to the legacy /post/:id route for showcase/feedback posts
// (no slug, by design - see lib/slug.ts on the backend) or a missing
// author username - both are real, permanent cases, not just a migration
// transition.
export function postUrl(post: { slug: string | null; id: string; author: { username: string | null } }): string {
  if (post.slug && post.author.username) return `/@${post.author.username}/${post.slug}`;
  return `/post/${post.id}`;
}

export function seriesUrl(series: { slug: string; author: { username: string | null } }): string {
  return series.author.username ? `/@${series.author.username}/series/${series.slug}` : "#";
}

// Mirrors the backend's normalizeTagToHashtag() (Resonancebackendv2's
// lib/hashtags.ts) exactly - has to, since this is what turns a route
// param back into the same token /topics/:tag pages actually match rows
// against. Needed here (not just on already-clean hashtagStats.tag
// values from the trending/sitemap endpoints) because article.tags is
// freeform user-typed text ("Design Systems", spaces and mixed case) -
// passing that straight into a URL would build a link nothing resolves.
function normalizeTagToken(tag: string): string {
  return tag
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 50);
}

export function topicUrl(tag: string): string {
  return `/topics/${normalizeTagToken(tag)}`;
}
