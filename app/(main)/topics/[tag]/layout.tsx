import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { getHashtagArticles, getHashtagPosts } from "@/lib/api/hashtags";
import { topicUrl } from "@/lib/urls";

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
  const hasContent = (articlesRes?.articles.length ?? 0) > 0 || (postsRes?.posts.length ?? 0) > 0;

  return constructMetadata({
    title: `#${tag} - Articles & Discussions | Resonance`,
    description: `Explore articles, ideas, and discussions about #${tag} on Resonance.`,
    canonical: topicUrl(tag),
    noIndex: !hasContent,
  });
}

export default function TopicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
