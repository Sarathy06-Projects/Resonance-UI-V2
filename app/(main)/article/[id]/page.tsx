"use client";

import { use, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Bookmark, Heart, MessageCircle, Share } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getArticle, recordArticleView } from "@/lib/api/articles";
import { createComment } from "@/lib/api/comments";
import { useArticleInteractions } from "@/lib/hooks/useArticleInteractions";
import { useFollowState } from "@/lib/hooks/useFollowState";
import { useAuthStore } from "@/store/useAuthStore";
import { timeAgo } from "@/lib/formatTime";
import { cn } from "@/lib/utils";
import { CommentInput } from "@/components/shared/CommentInput";
import { CommentThread } from "@/components/shared/CommentThread";
import { JsonLd } from "@/components/seo/JsonLd";
import { RelatedArticles } from "@/components/seo/RelatedArticles";
import type { Article } from "@/lib/api/types";

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: article, isLoading, error } = useSWR(`article-${resolvedParams.id}`, () => getArticle(resolvedParams.id));

  if (isLoading) {
    return <div className="p-10 text-center text-zinc-400">Loading article…</div>;
  }

  if (error || !article) {
    return <div className="p-10 text-center text-zinc-500">This article couldn&apos;t be found.</div>;
  }

  return <ArticleView article={article} />;
}

function ArticleView({ article }: { article: Article }) {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { isLiked, likesCount, isBookmarked, bookmarksCount, toggleLike, toggleBookmark } = useArticleInteractions(article);
  const { isFollowing, toggleFollow } = useFollowState(article.authorId, false);
  const isSelf = user?.id === article.authorId;

  useEffect(() => {
    recordArticleView(article.id).catch(() => {});
    // Fire once when this article view mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  const handleInteraction = (action: () => void) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    action();
  };

  const handleReplySubmit = async (content: string) => {
    await createComment({ targetType: "article", targetId: article.id, content });
    mutate(`comments-article-${article.id}`);
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "image": article.coverImage ? [article.coverImage] : [],
    "datePublished": article.publishedAt || article.createdAt,
    "author": [{
      "@type": "Person",
      "name": article.author.name,
      "url": `https://resonance.design/profile/${article.author.username}`
    }]
  };

  return (
    <main className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0">
      <JsonLd data={articleJsonLd} />
      <header className="sticky top-0 sm:top-16 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors dark:text-zinc-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href={`/profile/${article.author.username}`} className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={article.author.image ?? undefined} />
              <AvatarFallback>{article.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight dark:text-zinc-100">{article.author.name}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {timeAgo(article.publishedAt ?? article.createdAt)} {article.readTime ? `· ${article.readTime}` : ""}
              </span>
            </div>
          </Link>
        </div>
        {!isSelf && (
          <Button onClick={() => handleInteraction(toggleFollow)} className="rounded-full h-8 px-4 font-semibold text-xs">
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </header>

      <article className="max-w-3xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight dark:text-zinc-50">
            {article.title}
          </h1>
        </header>

        {article.coverImage && (
          <img src={article.coverImage} alt={article.title} className="w-full aspect-video object-cover rounded-2xl mb-12" />
        )}

        <div
          className="prose prose-zinc dark:prose-invert prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content || '' }}
        />

        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-12 mb-8">
            {article.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-y border-zinc-100 dark:border-zinc-800 py-4 mb-12">
          <div className="flex items-center gap-6 text-zinc-500 dark:text-zinc-400">
            <button
              onClick={() => handleInteraction(toggleLike)}
              className={cn("flex items-center gap-2 transition-colors", isLiked ? "text-pink-500" : "hover:text-pink-500")}
            >
              <Heart className={cn("w-6 h-6", isLiked && "fill-current")} />
              <span className="font-medium">{likesCount}</span>
            </button>
            <span className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              <span className="font-medium">{article.commentsCount}</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
            <button
              onClick={() => handleInteraction(toggleBookmark)}
              className={cn("transition-colors", isBookmarked ? "text-zinc-900 dark:text-white" : "hover:text-blue-500")}
            >
              <Bookmark className={cn("w-6 h-6", isBookmarked && "fill-current")} />
            </button>
            <button className="hover:text-blue-500 transition-colors"><Share className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 -mx-4 sm:-mx-8">
          <CommentInput onSubmit={handleReplySubmit} placeholder="Share your thoughts on this article" />
          <CommentThread targetType="article" targetId={article.id} targetAuthorId={article.authorId} />
        </div>
        <RelatedArticles currentArticleId={article.id} tags={article.tags || []} />
      </article>
    </main>
  );
}
