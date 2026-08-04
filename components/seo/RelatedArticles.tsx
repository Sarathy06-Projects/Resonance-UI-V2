"use client";

import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { ImageOff } from "lucide-react";
import { getPopularArticles } from "@/lib/api/articles";

export function RelatedArticles({ currentArticleId, tags }: { currentArticleId: string; tags: string[] }) {
  const { data } = useSWR("popular-articles-related", () => getPopularArticles(4));
  
  if (!data || !data.articles) return null;

  const related = data.articles
    .filter((a) => a.id !== currentArticleId)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section className="mt-12 pt-12 border-t border-zinc-100 dark:border-zinc-800">
      <h3 className="text-xl font-bold dark:text-white mb-6">Related Articles</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {related.map((article) => (
          <article key={article.id} className="group flex flex-col gap-3">
            <Link href={`/article/${article.id}`} className="relative block h-40 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              {article.coverImage ? (
                <Image
                  src={article.coverImage}
                  alt={`Cover image for ${article.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff className="w-6 h-6 text-zinc-300 dark:text-zinc-700" />
                </div>
              )}
            </Link>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wide">
                <span>{article.tags?.[0] || "Design"}</span>
                {article.readTime && (
                  <>
                    <span>·</span>
                    <span>{article.readTime}</span>
                  </>
                )}
              </div>
              <Link href={`/article/${article.id}`}>
                <h4 className="text-lg font-bold dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {article.title}
                </h4>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
