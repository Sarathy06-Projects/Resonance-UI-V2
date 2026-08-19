"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Bookmark, Heart, MessageCircle, Share, Layers } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { recordArticleView } from "@/lib/api/articles";
import { useArticleInteractions } from "@/lib/hooks/useArticleInteractions";
import { useFollowState } from "@/lib/hooks/useFollowState";
import { useAuthStore } from "@/store/useAuthStore";
import { timeAgo } from "@/lib/formatTime";
import { cn } from "@/lib/utils";
import { CommentThread } from "@/components/shared/CommentThread";
import { RelatedArticles } from "@/components/seo/RelatedArticles";
import { PostImageGrid } from "@/components/shared/ImageAttachments";
import { ShareSheet } from "@/components/shared/ShareSheet";
import { absoluteUrl } from "@/lib/share";
import { profileUrl, articleUrl, seriesUrl, topicUrl } from "@/lib/urls";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import type { Article, SeriesWithArticles } from "@/lib/api/types";

interface ArticleDetailViewProps {
  article: Article;
  // Fetched server-side via the article's seriesId (an opaque id, not a
  // slug - the series itself may not be the one this whole page resolved
  // through). Series has no author join on this endpoint, but a series can
  // only ever contain its own author's articles (enforced server-side at
  // publish time), so article.author doubles as the series' author for
  // link-building purposes here.
  series: SeriesWithArticles | null;
}

export function ArticleDetailView({ article, series }: ArticleDetailViewProps) {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { isLiked, likesCount, isBookmarked, bookmarksCount, toggleLike, toggleBookmark } = useArticleInteractions(article);
  const { isFollowing, toggleFollow } = useFollowState(article.authorId, false);
  const isSelf = user?.id === article.authorId;
  const [isShareOpen, setIsShareOpen] = useState(false);

  const seriesIndex = series?.articles.findIndex((a) => a.id === article.id) ?? -1;
  const prevInSeries = series && seriesIndex > 0 ? series.articles[seriesIndex - 1] : null;
  const nextInSeries = series && seriesIndex >= 0 && seriesIndex < series.articles.length - 1 ? series.articles[seriesIndex + 1] : null;

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

  return (
    <main className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors dark:text-zinc-100" aria-label="Back to feed">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href={profileUrl(article.author)} className="flex items-center gap-2">
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
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            ...(article.tags?.[0] ? [{ label: `#${article.tags[0]}`, href: topicUrl(article.tags[0]) }] : []),
            { label: article.title },
          ]}
        />
        {series && (
          <Link
            href={seriesUrl({ slug: series.slug, author: article.author })}
            className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              Part {article.seriesPosition ?? seriesIndex + 1} of {series.articlesCount} in {series.title}
            </span>
          </Link>
        )}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight dark:text-zinc-50">
            {article.title}
          </h1>
        </header>

        {article.coverImage && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-12">
            <Image src={article.coverImage} alt={article.title} fill sizes="(max-width: 768px) 100vw, 768px" priority className="object-cover" />
          </div>
        )}

        <div
          className="prose prose-zinc dark:prose-invert prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content || '' }}
        />

        {article.images && article.images.length > 0 && (
          <div className="mt-12">
            <PostImageGrid images={article.images} />
          </div>
        )}

        {series && (prevInSeries || nextInSeries) && (
          <div className="grid sm:grid-cols-2 gap-4 mt-12">
            {prevInSeries && (
              <Link
                href={articleUrl({ slug: prevInSeries.slug, author: article.author })}
                className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">← Previous in series</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">{prevInSeries.title}</div>
              </Link>
            )}
            {nextInSeries && (
              <Link
                href={articleUrl({ slug: nextInSeries.slug, author: article.author })}
                className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors sm:text-right sm:col-start-2"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Next in series →</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">{nextInSeries.title}</div>
              </Link>
            )}
          </div>
        )}

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
            {/* Was a bare <span>: the glyph and the count rendered, and
                nothing happened when anyone pressed them. An article's
                comments are further down the same page, so this jumps to
                them - the same #comments anchor CommentThread carries, and
                the same behaviour the comment icon on a post's own detail
                page has. An anchor rather than a button, so it announces
                itself as navigation and previews where it goes. */}
            <Link
              href="#comments"
              aria-label={`${article.commentsCount} ${article.commentsCount === 1 ? "comment" : "comments"}, jump to them`}
              className="flex items-center gap-2 transition-colors hover:text-blue-500"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="font-medium">{article.commentsCount}</span>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
            <button
              onClick={() => handleInteraction(toggleBookmark)}
              className={cn("transition-colors", isBookmarked ? "text-zinc-900 dark:text-white" : "hover:text-blue-500")}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <Bookmark className={cn("w-6 h-6", isBookmarked && "fill-current")} />
            </button>
            <button
              onClick={() => setIsShareOpen(true)}
              className="transition-colors hover:text-blue-500"
              aria-label="Share"
            >
              <Share className="h-6 w-6" />
            </button>
          </div>
        </div>

        {isShareOpen && (
          <ShareSheet
            open={isShareOpen}
            onOpenChange={setIsShareOpen}
            content={{
              url: absoluteUrl(articleUrl(article)),
              title: article.title,
              text: article.preview ?? article.title,
            }}
          />
        )}

        <div className="border-t border-zinc-100 dark:border-zinc-800 -mx-4 sm:-mx-8">
          <CommentThread targetType="article" targetId={article.id} targetAuthorId={article.authorId} />
        </div>
        <RelatedArticles currentArticleId={article.id} tags={article.tags || []} />
      </article>
    </main>
  );
}
