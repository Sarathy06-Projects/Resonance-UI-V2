import { MetadataRoute } from "next";
import { getArticlesSitemapFeed } from "@/lib/api/articles";
import { getPostsSitemapFeed } from "@/lib/api/posts";
import { getSeriesSitemapFeed } from "@/lib/api/series";
import { getUsersSitemapFeed } from "@/lib/api/users";
import { getHashtagsSitemapFeed } from "@/lib/api/hashtags";
import { articleUrl, seriesUrl, profileUrl, topicUrl } from "@/lib/urls";
import { getSiteUrl } from "@/lib/siteUrl";

const siteUrl = getSiteUrl();

// Google caps a single sitemap file at 50,000 URLs. Rather than one file
// with 5 content types accumulating together (previously up to 100,000 URLs
// in one file - the exact violation this was flagged for), each content
// type gets its own file via generateSitemaps(), and each file is capped
// well under the real limit. At current volume (low hundreds per type)
// this is nowhere close; the cap exists so growth can never silently
// exceed Google's limit before anyone notices.
//
// Cursor pagination (not offset) means jumping straight to "chunk N" isn't
// possible without walking chunks 0..N-1 first - the backend intentionally
// uses cursors for pagination stability during concurrent writes. So this
// caps each type at one 45,000-URL file rather than true multi-file
// chunking per type. If any single type ever approaches 45,000 real
// indexable rows, the next step is a backend total-count endpoint so
// generateSitemaps() can compute how many chunks that type needs and split
// it the same way - not a rewrite of this approach, an extension of it.
const MAX_PER_TYPE = 45000;

type SitemapEntry = MetadataRoute.Sitemap[number];

export const SITEMAP_IDS = ["static", "articles", "posts", "series", "profiles", "topics"] as const;
type SitemapId = (typeof SITEMAP_IDS)[number];

export async function generateSitemaps() {
  return SITEMAP_IDS.map((_, id) => ({ id }));
}

async function collectAll<T>(fetchPage: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null }>): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | null = null;
  do {
    const page = await fetchPage(cursor);
    all.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor && all.length < MAX_PER_TYPE);
  return all;
}

async function buildSitemap(kind: SitemapId): Promise<MetadataRoute.Sitemap> {
  switch (kind) {
    case "static":
      // No fabricated lastModified - these are evergreen root pages, not
      // tied to any single row's updatedAt. Omitting lastModified is valid
      // per MetadataRoute.Sitemap rather than lying with `new Date()`.
      return [
        { url: siteUrl, changeFrequency: "always", priority: 1 },
        { url: `${siteUrl}/explore`, changeFrequency: "hourly", priority: 0.9 },
      ];

    case "articles": {
      const articles = await collectAll((cursor) => getArticlesSitemapFeed(cursor).then((r) => ({ items: r.articles, nextCursor: r.nextCursor })));
      return articles.map(
        (a): SitemapEntry => ({
          url: `${siteUrl}${articleUrl({ slug: a.slug, author: { username: a.username } })}`,
          lastModified: new Date(a.updatedAt),
          priority: 0.8,
        })
      );
    }

    case "posts": {
      const posts = await collectAll((cursor) => getPostsSitemapFeed(cursor).then((r) => ({ items: r.posts, nextCursor: r.nextCursor })));
      // getPostsSitemapFeed is already server-side filtered to indexable
      // discussion posts, which always carry a real slug - no id-based
      // /post/:id fallback needed (previously faked via postUrl(..., id: "")).
      return posts.map(
        (p): SitemapEntry => ({
          url: `${siteUrl}/@${p.username}/${p.slug}`,
          lastModified: new Date(p.updatedAt),
          priority: 0.6,
        })
      );
    }

    case "series": {
      const series = await collectAll((cursor) => getSeriesSitemapFeed(cursor).then((r) => ({ items: r.series, nextCursor: r.nextCursor })));
      return series.map(
        (s): SitemapEntry => ({
          url: `${siteUrl}${seriesUrl({ slug: s.slug, author: { username: s.username } })}`,
          lastModified: new Date(s.updatedAt),
          priority: 0.6,
        })
      );
    }

    case "profiles": {
      const users = await collectAll((cursor) => getUsersSitemapFeed(cursor).then((r) => ({ items: r.users, nextCursor: r.nextCursor })));
      return users.map(
        (u): SitemapEntry => ({
          url: `${siteUrl}${profileUrl({ username: u.username })}`,
          lastModified: new Date(u.updatedAt),
          priority: 0.6,
        })
      );
    }

    case "topics": {
      const hashtags = await collectAll((cursor) => getHashtagsSitemapFeed(cursor).then((r) => ({ items: r.hashtags, nextCursor: r.nextCursor })));
      return hashtags.map(
        (h): SitemapEntry => ({
          url: `${siteUrl}${topicUrl(h.tag)}`,
          lastModified: new Date(h.updatedAt),
          priority: 0.7,
        })
      );
    }
  }
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  // Next resolves the route's [id] segment as a string promise (matching
  // the async-params convention used across this app), not a synchronous
  // number - confirmed at runtime via next-metadata-route-loader.js, which
  // calls the default export with `{ id: targetIdPromise }`.
  const resolvedId = await id;
  return buildSitemap(SITEMAP_IDS[Number(resolvedId)]);
}
