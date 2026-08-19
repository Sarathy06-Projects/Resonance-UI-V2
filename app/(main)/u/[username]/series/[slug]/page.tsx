import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { getSeriesBySlug } from "@/lib/api/series";
import { ApiError } from "@/lib/api/client";
import { timeAgo } from "@/lib/formatTime";
import { articleUrl, profileUrl, seriesUrl } from "@/lib/urls";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/shared/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteUrl } from "@/lib/siteUrl";

const siteUrl = getSiteUrl();

// No client interactivity at all here (just navigation links), so unlike
// the profile/article/post routes this needs no client sub-component -
// the whole page is server-rendered.
export default async function SeriesPage({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;

  const series = await getSeriesBySlug(username, slug).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  const breadcrumbs = breadcrumbJsonLd([
    { label: "Home", url: siteUrl },
    { label: series.author.name, url: `${siteUrl}${profileUrl(series.author)}` },
    { label: series.title, url: `${siteUrl}${seriesUrl(series)}` },
  ]);

  return (
    <main className="flex flex-col min-h-screen pb-20 md:pb-0">
      {/* Carries the author's name and the series title - see JsonLd. */}
      <JsonLd id="series-breadcrumbs-json-ld" data={breadcrumbs} />
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-6">
        <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors dark:text-zinc-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight dark:text-white">Series</h1>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 py-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: series.author.name, href: profileUrl(series.author) }, { label: series.title }]} />
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
          <Layers className="w-3.5 h-3.5" />
          <span>{series.articlesCount} part series</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight dark:text-white mb-3">{series.title}</h1>
        {series.description && <p className="text-zinc-500 dark:text-zinc-400 mb-8">{series.description}</p>}

        <div className="flex flex-col gap-3 mt-6">
          {series.articles.map((article, idx) => (
            <Link
              key={article.id}
              href={articleUrl({ slug: article.slug, author: series.author })}
              className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="w-8 h-8 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-sm font-bold text-zinc-500">
                {article.seriesPosition ?? idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{article.title}</div>
                {article.preview && <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{article.preview}</p>}
              </div>
              {article.publishedAt && (
                <span className="text-xs text-zinc-400 shrink-0">{timeAgo(article.publishedAt)}</span>
              )}
            </Link>
          ))}
          {series.articles.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No published articles in this series yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
