"use client";

import useSWR from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Heart, Repeat2, Bookmark, Share, FileText, Clock } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { usePostInteractions } from "@/lib/hooks/usePostInteractions";
import { getArticle } from "@/lib/api/articles";
import { timeAgo } from "@/lib/formatTime";
import type { Post } from "@/lib/api/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: Post;
  isDetailed?: boolean;
}

export function PostCard({ post, isDetailed = false }: PostCardProps) {
  const { isAuthenticated, openAuthModal } = useAuthStore();
  const { isLiked, likesCount, isBookmarked, bookmarksCount, sharesCount, toggleLike, toggleBookmark, toggleRepost } =
    usePostInteractions(post);
  const router = useRouter();

  // Feed/list responses don't embed the linked article preview (only the
  // single-post GET does) - fetch it lazily and let SWR cache it by id.
  const { data: fetchedLinkedArticle } = useSWR(
    post.linkedArticleId && !post.linkedArticle ? `article-preview-${post.linkedArticleId}` : null,
    () => getArticle(post.linkedArticleId!)
  );
  const linkedArticle = post.linkedArticle ?? fetchedLinkedArticle ?? null;

  const handleInteraction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (action) action();
  };

  const handleCardClick = () => {
    if (!isDetailed) {
      router.push(`/post/${post.id}`);
    }
  };

  return (
    <div
      className={cn("p-6 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/80 hover:shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-all duration-300 rounded-3xl cursor-pointer mb-2 group/card", isDetailed && "hover:bg-transparent hover:shadow-none cursor-default mb-0")}
      onClick={handleCardClick}
    >
      {post.linkedArticleId && (
        <div className="flex items-center gap-1.5 mb-4 text-xs font-bold uppercase tracking-wider text-zinc-500 ml-15">
          <FileText className="w-3.5 h-3.5" />
          <span>Article</span>
        </div>
      )}

      <div className="flex gap-4">
        <Link href={`/profile/${post.author.username}`} className="shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
          <Avatar className="w-11 h-11 border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <AvatarImage src={post.author.image ?? undefined} />
            <AvatarFallback className="dark:bg-zinc-800 dark:text-zinc-300">{post.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/profile/${post.author.username}`} className="flex items-center gap-1.5 truncate hover:underline" onClick={(e) => e.stopPropagation()}>
              <span className="font-bold text-[16px] text-zinc-950 dark:text-zinc-100 truncate tracking-tight">{post.author.name}</span>
              <span className="text-[14px] text-zinc-500 dark:text-zinc-400 font-medium truncate">@{post.author.username}</span>
            </Link>
            <span className="text-[14px] text-zinc-500 dark:text-zinc-400 font-medium shrink-0">· {timeAgo(post.createdAt)}</span>
          </div>

          <p className="text-[15px] leading-relaxed text-zinc-950 dark:text-zinc-200 mb-4 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {post.images && post.images.length > 0 && (
            <div className="mt-4 mb-4 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/60 shadow-sm">
              <img src={post.images[0]} alt="Post attachment" className="w-full h-auto object-cover max-h-[400px]" />
            </div>
          )}

          {linkedArticle && (
            <div
              className="mt-4 mb-4 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/60 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors bg-white dark:bg-zinc-900 flex flex-col sm:flex-row group/article"
              onClick={(e) => { e.stopPropagation(); router.push(`/article/${linkedArticle.id}`); }}
            >
              <div className="sm:w-1/3 h-[140px] sm:h-auto shrink-0 relative overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                {linkedArticle.coverImage && (
                  <img src={linkedArticle.coverImage} className="w-full h-full object-cover group-hover/article:scale-105 transition-transform duration-500" />
                )}
              </div>
              <div className="p-4 sm:p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Article</span>
                  {linkedArticle.readTime && (
                    <>
                      <span>·</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{linkedArticle.readTime}</span>
                    </>
                  )}
                </div>
                <h4 className="font-bold text-[15px] text-zinc-900 dark:text-white leading-tight mb-2 line-clamp-2">{linkedArticle.title}</h4>
                <p className="text-sm text-zinc-500 line-clamp-2 flex-1">{linkedArticle.preview}</p>
              </div>
            </div>
          )}

          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.hashtags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/hashtag/${tag.replace('#', '')}`}
                  className="text-sm text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between max-w-[400px] text-zinc-400 dark:text-zinc-500 mt-2">
            <button onClick={(e) => handleInteraction(e)} className="flex items-center gap-1.5 group transition-colors hover:text-zinc-700 dark:hover:text-zinc-300" title="Comment">
              <div className="p-2 rounded-full group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors -ml-2">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-[13px] font-medium">{post.commentsCount}</span>
            </button>
            <button onClick={(e) => handleInteraction(e, toggleRepost)} className="flex items-center gap-1.5 group transition-colors hover:text-zinc-700 dark:hover:text-zinc-300" title="Repost">
              <div className="p-2 rounded-full group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors -ml-2">
                <Repeat2 className="w-5 h-5" />
              </div>
              <span className="text-[13px] font-medium">{sharesCount}</span>
            </button>
            <button
              onClick={(e) => handleInteraction(e, toggleLike)}
              className={cn("flex items-center gap-1.5 group transition-colors", isLiked ? "text-pink-600 dark:text-pink-500" : "hover:text-zinc-700 dark:hover:text-zinc-300")}
              title="Like"
            >
              <div className={cn("p-2 rounded-full transition-colors -ml-2", isLiked ? "bg-pink-50 dark:bg-pink-500/10" : "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800")}>
                <Heart className={cn("w-5 h-5", isLiked && "fill-current scale-110")} />
              </div>
              <span className="text-[13px] font-medium">{likesCount}</span>
            </button>
            <button
              onClick={(e) => handleInteraction(e, toggleBookmark)}
              className={cn("flex items-center gap-1.5 group transition-colors", isBookmarked ? "text-zinc-900 dark:text-white" : "hover:text-zinc-700 dark:hover:text-zinc-300")}
              title="Bookmark"
            >
              <div className={cn("p-2 rounded-full transition-colors -ml-2", isBookmarked ? "bg-zinc-100 dark:bg-zinc-800" : "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800")}>
                <Bookmark className={cn("w-5 h-5", isBookmarked && "fill-current scale-110")} />
              </div>
              <span className="text-[13px] font-medium">{bookmarksCount}</span>
            </button>
            <button onClick={(e) => handleInteraction(e)} className="flex items-center gap-1.5 group transition-colors hover:text-zinc-700 dark:hover:text-zinc-300" title="Share">
              <div className="p-2 rounded-full group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors -ml-2">
                <Share className="w-5 h-5" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
