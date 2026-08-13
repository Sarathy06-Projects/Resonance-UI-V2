import { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { getHashtagArticles } from "@/lib/api/hashtags";
import { topicUrl } from "@/lib/urls";
import { constructMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ cursor?: string }>;
};

// Own generateMetadata (rather than inheriting the parent hub layout's)
// because canonical must vary per page - this is real, distinct listing
// content, not an alternate view of the hub at /topics/:tag.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const { cursor } = await searchParams;
  const tag = decodeURIComponent(rawTag);
  const canonical = `${topicUrl(tag)}/articles${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`;

  return constructMetadata({
    title: `#${tag} Articles - Resonance`,
    description: `Browse articles tagged #${tag} on Resonance.`,
    canonical,
  });
}

export default async function TopicArticlesPage({ params, searchParams }: Props) {
  const { tag: rawTag } = await params;
  const { cursor } = await searchParams;
  const tag = decodeURIComponent(rawTag);

  const { articles, nextCursor } = await getHashtagArticles(tag, cursor ?? null).catch(() => ({ articles: [], nextCursor: null }));

  return (
    <main className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0">
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800">
        <div className="px-4 py-4 sm:px-6 flex items-center gap-4">
          <Link href={topicUrl(tag)}>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0">
              <ArrowLeft className="w-5 h-5 dark:text-zinc-200" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight dark:text-white flex items-center gap-1">
              <span className="text-zinc-400 font-medium">#</span>
              {tag} — Articles
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{articles.length} {articles.length === 1 ? "article" : "articles"}{cursor ? " on this page" : ""}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 dark:text-white">No articles found</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">There are currently no articles tagged #{tag}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {articles.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        )}

        {/* Real <a href> pagination, not a client-side "load more" button -
            a crawler needs an actual link to reach page 2+. */}
        {nextCursor && (
          <div className="flex justify-center pt-8">
            <Link href={`${topicUrl(tag)}/articles?cursor=${encodeURIComponent(nextCursor)}`}>
              <Button variant="outline" className="rounded-full">
                Next page <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
