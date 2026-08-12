import { MetadataRoute } from "next";
import { getArticlesSitemapFeed } from "@/lib/api/articles";
import { getPostsSitemapFeed } from "@/lib/api/posts";
import { getSeriesSitemapFeed } from "@/lib/api/series";
import { getUsersSitemapFeed } from "@/lib/api/users";
import { getHashtagsSitemapFeed } from "@/lib/api/hashtags";
import { articleUrl, postUrl, seriesUrl, profileUrl, topicUrl } from "@/lib/urls";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resonance.design";

// Google caps a single sitemap file at 50,000 URLs. Current content volume
// is nowhere near that (low hundreds), so this loops every cursor page of
// each already-filtered-to-indexable backend feed into one file rather than
// using Next's generateSitemaps() multi-file splitting - simpler for actual
// scale today, and the backend endpoints are already cursor-paginated, so
// splitting is a contained addition later if this cap is ever actually
// approached (each loop below would become its own generateSitemaps() id
// instead of accumulating into `all`).
const MAX_PER_TYPE = 20000;

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, posts, series, users, hashtags] = await Promise.all([
    collectAll((cursor) => getArticlesSitemapFeed(cursor).then((r) => ({ items: r.articles, nextCursor: r.nextCursor }))),
    collectAll((cursor) => getPostsSitemapFeed(cursor).then((r) => ({ items: r.posts, nextCursor: r.nextCursor }))),
    collectAll((cursor) => getSeriesSitemapFeed(cursor).then((r) => ({ items: r.series, nextCursor: r.nextCursor }))),
    collectAll((cursor) => getUsersSitemapFeed(cursor).then((r) => ({ items: r.users, nextCursor: r.nextCursor }))),
    collectAll((cursor) => getHashtagsSitemapFeed(cursor).then((r) => ({ items: r.hashtags, nextCursor: r.nextCursor }))),
  ]);

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "always", priority: 1 },
    { url: `${siteUrl}/explore`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },

    ...articles.map((a) => ({
      url: `${siteUrl}${articleUrl({ slug: a.slug, author: { username: a.username } })}`,
      lastModified: new Date(a.updatedAt),
      priority: 0.8,
    })),

    ...posts.map((p) => ({
      url: `${siteUrl}${postUrl({ slug: p.slug, id: "", author: { username: p.username } })}`,
      lastModified: new Date(p.updatedAt),
      priority: 0.6,
    })),

    ...series.map((s) => ({
      url: `${siteUrl}${seriesUrl({ slug: s.slug, author: { username: s.username } })}`,
      lastModified: new Date(s.updatedAt),
      priority: 0.6,
    })),

    ...users.map((u) => ({
      url: `${siteUrl}${profileUrl({ username: u.username })}`,
      lastModified: new Date(u.updatedAt),
      priority: 0.6,
    })),

    ...hashtags.map((h) => ({
      url: `${siteUrl}${topicUrl(h.tag)}`,
      lastModified: new Date(h.updatedAt),
      priority: 0.7,
    })),
  ];
}
