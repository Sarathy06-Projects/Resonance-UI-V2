"use client";

import Link from "next/link";
import useSWR from "swr";
import { getUserArticles } from "@/lib/api/articles";

export function MoreFromAuthor({ authorId, currentArticleId }: { authorId: string; currentArticleId?: string }) {
  const { data } = useSWR(`author-articles-${authorId}`, () => getUserArticles(authorId));

  if (!data || !data.articles) return null;

  const authorArticles = data.articles
    .filter((a) => a.id !== currentArticleId)
    .slice(0, 4);

  if (authorArticles.length === 0) return null;

  return (
    <section className="mt-12 pt-12 border-t border-zinc-100 dark:border-zinc-800">
      <h3 className="text-lg font-bold dark:text-white mb-4">More from this Author</h3>
      <div className="space-y-4">
        {authorArticles.map((article) => (
          <article key={article.id} className="group">
            <Link href={`/article/${article.id}`}>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                {article.title}
              </h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{article.readTime}</p>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
