import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, Layers, ImageOff } from "lucide-react";
import type { Article } from "@/lib/api/types";
import { timeAgo } from "@/lib/formatTime";

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link href={`/article/${article.id}`} className="block group h-full w-[300px] sm:w-[380px] shrink-0">
      <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300">

        <div className="w-full h-[200px] overflow-hidden bg-zinc-100 dark:bg-zinc-900 relative">
          {article.coverImage ? (
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 300px, 380px"
              loading="lazy"
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
            </div>
          )}
          {article.readTime && (
            <div className="absolute top-3 right-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm">
              {article.readTime}
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 border border-zinc-100 dark:border-zinc-800">
                <AvatarImage src={article.author.image ?? undefined} />
                <AvatarFallback className="dark:bg-zinc-800 dark:text-zinc-300">{article.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-100 leading-none">{article.author.name}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1.5">{timeAgo(article.createdAt)}</span>
              </div>
            </div>

            <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={(e) => { e.preventDefault(); }} aria-label="Bookmark">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>

          {article.seriesId && (
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              <Layers className="w-3 h-3" />
              <span>Part {article.seriesPosition ?? "?"}</span>
            </div>
          )}

          <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
            {article.title}
          </h3>

          <p className="text-zinc-500 dark:text-zinc-400 text-[15px] leading-relaxed line-clamp-2 mb-6 flex-1 font-medium">
            {article.preview}
          </p>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex gap-1.5 flex-wrap">
              {article.tags?.slice(0, 2).map((tag) => (
                <span key={tag} className="bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {tag}
                </span>
              ))}
            </div>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
              Read
            </span>
          </div>
        </div>

      </div>
    </Link>
  );
}
