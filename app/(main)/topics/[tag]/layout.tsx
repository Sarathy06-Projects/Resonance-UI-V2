import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { getHashtagArticles, getHashtagPosts } from "@/lib/api/hashtags";
import { topicUrl } from "@/lib/urls";

// A tag with only 1-2 pieces of content is a thin page, not worth its own
// search result. Kept in sync with the same threshold applied server-side
// in the backend's /api/hashtags/sitemap-feed (MIN_TOPIC_CONTENT). Below
// this bar the page still renders (a real internal link, e.g. from an
// article's own tag, can land here) but is marked noIndex rather than 404 -
// existence and indexability are separate questions.
const MIN_TOPIC_CONTENT = 3;

// Previously (the old /hashtag/[tag]/layout.tsx) this never made an API
// call at all - just interpolated the raw param into a generic title,
// so a nonexistent/empty tag still got indexable-looking metadata (a
// soft-404 risk). Now actually checks for content.
export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);

  const [articlesRes, postsRes] = await Promise.all([
    getHashtagArticles(tag).catch(() => null),
    getHashtagPosts(tag).catch(() => null),
  ]);
  // Both feeds default to a page size of 20 (well above the threshold
  // below), so a raw returned-length comparison is an accurate proxy for
  // "total content" here without needing a separate count endpoint.
  const totalContent = (articlesRes?.articles.length ?? 0) + (postsRes?.posts.length ?? 0);

  return constructMetadata({
    title: `#${tag} - Articles & Discussions | Resonance`,
    description: `Explore articles, ideas, and discussions about #${tag} on Resonance.`,
    canonical: topicUrl(tag),
    noIndex: totalContent < MIN_TOPIC_CONTENT,
  });
}

export default function TopicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
