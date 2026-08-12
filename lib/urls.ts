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

export function topicUrl(tag: string): string {
  return `/topics/${tag.startsWith("#") ? tag.slice(1) : tag}`;
}
