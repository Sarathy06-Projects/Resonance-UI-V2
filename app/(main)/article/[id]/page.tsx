"use client";

import { use } from "react";
import { mockArticles } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Bookmark, Heart, MessageCircle, Share } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  // Find article or fallback
  const article = mockArticles.find(a => a.id === resolvedParams.id) || mockArticles[0];

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0">
      <div className="sticky top-0 sm:top-16 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors dark:text-zinc-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={article.author.avatar} />
              <AvatarFallback>{article.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight dark:text-zinc-100">{article.author.name}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{article.timestamp} · {article.readTime}</span>
            </div>
          </div>
        </div>
        <Button className="rounded-full h-8 px-4 font-semibold text-xs">Follow</Button>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight mb-8 dark:text-zinc-50">
          {article.title}
        </h1>

        <img src={article.coverImage} alt={article.title} className="w-full aspect-video object-cover rounded-2xl mb-12" />

        <div 
          className="prose prose-zinc dark:prose-invert prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content || '' }}
        />

        <div className="flex flex-wrap gap-2 mt-12 mb-8">
          {article.tags?.map(tag => (
            <span key={tag} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors">
              {tag}
            </span>
          ))}
        </div>

        {/* Article Interactions */}
        <div className="flex items-center justify-between border-y border-zinc-100 dark:border-zinc-800 py-4 mb-12">
          <div className="flex items-center gap-6 text-zinc-500 dark:text-zinc-400">
            <button className="flex items-center gap-2 hover:text-pink-500 transition-colors">
              <Heart className="w-6 h-6" />
              <span className="font-medium">1.2K</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
              <MessageCircle className="w-6 h-6" />
              <span className="font-medium">45</span>
            </button>
          </div>
          <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
            <button className="hover:text-blue-500 transition-colors"><Bookmark className="w-6 h-6" /></button>
            <button className="hover:text-blue-500 transition-colors"><Share className="w-6 h-6" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
