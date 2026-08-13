import { notFound } from "next/navigation";
import Link from "next/link";
import { Hash, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { PostCard } from "@/components/shared/PostCard";
import { getHashtagArticles, getHashtagPosts } from "@/lib/api/hashtags";
import { articleUrl, postUrl, topicUrl } from "@/lib/urls";
import { getSiteUrl } from "@/lib/siteUrl";

const siteUrl = getSiteUrl();

// Hub landing - a preview of both content types with links through to the
// full listings. Real content aggregation (the point of a "topic hub" page
// per the SEO plan), not just a rename of the old hashtag-only feed - see
// ./articles and ./discussions for the full listings this links to.
export default async function TopicPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);

  const [articlesRes, postsRes] = await Promise.all([
    getHashtagArticles(tag).catch(() => null),
    getHashtagPosts(tag).catch(() => null),
  ]);

  const articles = articlesRes?.articles ?? [];
  const posts = postsRes?.posts ?? [];

  if (articles.length === 0 && posts.length === 0) notFound();

  // Mirrors exactly what's rendered below (same slice(0,6)/slice(0,5)) -
  // the ItemList should describe the real page content, not a superset
  // the visitor never sees.
  const visibleArticles = articles.slice(0, 6);
  const visiblePosts = posts.slice(0, 5);
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `#${tag} - Resonance`,
    url: `${siteUrl}${topicUrl(tag)}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        ...visibleArticles.map((article, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${siteUrl}${articleUrl(article)}`,
          name: article.title,
        })),
        ...visiblePosts.map((post, i) => ({
          "@type": "ListItem",
          position: visibleArticles.length + i + 1,
          url: `${siteUrl}${postUrl(post)}`,
          name: post.content.length > 80 ? `${post.content.slice(0, 80)}...` : post.content,
        })),
      ],
    },
  };

  return (
    <main className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />

      <div className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800">
        <div className="px-4 py-4 sm:px-6 flex items-center gap-4">
          <Link href="/explore">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0">
              <ArrowLeft className="w-5 h-5 dark:text-zinc-200" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight dark:text-white flex items-center gap-1">
              <span className="text-zinc-400 font-medium">#</span>
              {tag}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {articles.length} {articles.length === 1 ? "article" : "articles"} · {posts.length} {posts.length === 1 ? "discussion" : "discussions"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-12">
        {articles.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold dark:text-white">Articles</h2>
              <Link href={`${topicUrl(tag)}/articles`} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {articles.slice(0, 6).map((article) => <ArticleCard key={article.id} article={article} />)}
            </div>
          </section>
        )}

        {posts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold dark:text-white">Discussions</h2>
              <Link href={`${topicUrl(tag)}/discussions`} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-100 dark:border-zinc-800/60 rounded-3xl overflow-hidden">
              {posts.slice(0, 5).map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          </section>
        )}

        {articles.length === 0 && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
              <Hash className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 dark:text-white">Nothing here yet</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">There&apos;s no content tagged #{tag} yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
