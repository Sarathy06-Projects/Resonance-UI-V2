"use client";

import { use } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { getSeries } from "@/lib/api/series";
import { timeAgo } from "@/lib/formatTime";

export default function SeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: series, isLoading, error } = useSWR(`series-${resolvedParams.id}`, () => getSeries(resolvedParams.id));

  return (
    <main className="flex flex-col min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 sm:top-16 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-6">
        <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors dark:text-zinc-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight dark:text-white">Series</h1>
      </div>

      {isLoading && <div className="p-10 text-center text-zinc-400">Loading series…</div>}
      {error && !isLoading && <div className="p-10 text-center text-zinc-500">This series couldn&apos;t be found.</div>}

      {series && (
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 py-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>{series.articlesCount} part series</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight dark:text-white mb-3">{series.title}</h1>
          {series.description && <p className="text-zinc-500 dark:text-zinc-400 mb-8">{series.description}</p>}

          <div className="flex flex-col gap-3 mt-6">
            {series.articles.map((article, idx) => (
              <Link
                key={article.id}
                href={`/article/${article.id}`}
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
      )}
    </main>
  );
}
