"use client";

import useSWR from "swr";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Heart, Repeat2, Bookmark, Share, FileText, Clock, Layers } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { usePostInteractions } from "@/lib/hooks/usePostInteractions";
import { getArticle } from "@/lib/api/articles";
import { timeAgo } from "@/lib/formatTime";
import type { Post } from "@/lib/api/types";
import { PostImageGrid } from "@/components/shared/ImageAttachments";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/formatCount";
import { profileUrl, postUrl, articleUrl, topicUrl } from "@/lib/urls";

interface PostCardProps {
  post: Post;
  isDetailed?: boolean;
  priority?: boolean;
}

// Mobile-first, and structurally so - not the desktop card with smaller
// padding. The differences that matter on a phone:
//
//  - One avatar rail down the left, name/time on a single line. The desktop
//    card wrapped name + @handle + time onto two lines at phone widths, which
//    cost a whole row of vertical space per post.
//  - Action icons carry no inline counts. Five icon+number pairs don't fit
//    across 360px without shrinking the targets below the ~44px minimum, so
//    counts move to one summary line underneath and the icons stay tappable.
//  - No hover affordances (there is no hover); feedback is active:scale
//    instead, which is what a touch device can actually show.
export function PostCard({ post, isDetailed = false, priority = false }: PostCardProps) {
  const { isAuthenticated, openAuthModal } = useAuthStore();
  const { isLiked, likesCount, isBookmarked, sharesCount, toggleLike, toggleBookmark, toggleRepost } =
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
    if (!isDetailed) router.push(postUrl(post));
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.author.username) e.preventDefault();
  };

  const commentsCount = post.commentsCount ?? 0;
  const summary = [
    commentsCount > 0 && `${formatCount(commentsCount)} ${commentsCount === 1 ? "reply" : "replies"}`,
    likesCount > 0 && `${formatCount(likesCount)} ${likesCount === 1 ? "like" : "likes"}`,
    sharesCount > 0 && `${formatCount(sharesCount)} ${sharesCount === 1 ? "repost" : "reposts"}`,
  ].filter(Boolean) as string[];

  return (
    <article
      className={cn(
        "px-4 py-3.5 transition-colors sm:px-6 sm:py-5",
        !isDetailed && "cursor-pointer active:bg-zinc-50 md:hover:bg-zinc-50/80 dark:active:bg-zinc-900/60 dark:md:hover:bg-zinc-900/60"
      )}
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        {/* Avatar rail. The connector line under the avatar is what makes a
            multi-post thread read as one continuous conversation rather than
            as unrelated cards that happen to be adjacent. */}
        <div className="flex shrink-0 flex-col items-center">
          <Link href={profileUrl(post.author)} onClick={stopPropagation}>
            <Avatar className="h-9 w-9 border border-zinc-100 sm:h-11 sm:w-11 dark:border-zinc-800">
              <AvatarImage src={post.author.image ?? undefined} alt="" />
              <AvatarFallback className="text-sm dark:bg-zinc-800 dark:text-zinc-300">
                {post.author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
          {post.threadId && !isDetailed && (
            <span aria-hidden className="mt-2 w-0.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Identity line: name, then handle and time collapsed to the
              right. The handle drops below `sm` - at 360px it pushes the
              timestamp off-screen, and the avatar plus name already identify
              the author. */}
          <div className="flex items-baseline gap-1.5">
            <Link
              href={profileUrl(post.author)}
              onClick={stopPropagation}
              className="truncate text-[15px] font-semibold tracking-tight text-zinc-950 dark:text-zinc-100"
            >
              {post.author.name}
            </Link>
            {post.author.username && (
              <span className="hidden truncate text-[14px] font-normal text-zinc-500 sm:inline dark:text-zinc-400">
                @{post.author.username}
              </span>
            )}
            <span className="ml-auto shrink-0 text-[13px] text-zinc-400 dark:text-zinc-500">
              {timeAgo(post.createdAt)}
            </span>
          </div>

          {(post.linkedArticleId || post.threadId) && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {post.linkedArticleId ? <FileText className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
              <span>{post.linkedArticleId ? "Article" : "Thread"}</span>
            </div>
          )}

          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-[1.5] text-zinc-950 dark:text-zinc-200">
            {post.content}
          </p>

          {post.images && post.images.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-2xl">
              <PostImageGrid images={post.images} priority={priority} />
            </div>
          )}

          {linkedArticle && (
            <div
              className="mt-3 flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-colors active:bg-zinc-50 sm:flex-row dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800"
              onClick={(e) => {
                e.stopPropagation();
                // linkedArticle is either the embedded ArticlePreview (flat
                // authorUsername) or the SWR-fetched full Article (nested
                // author.username) - two different response shapes for the
                // same underlying article, see the useSWR call above.
                const authorUsername = "authorUsername" in linkedArticle ? linkedArticle.authorUsername : linkedArticle.author.username;
                router.push(articleUrl({ slug: linkedArticle.slug, author: { username: authorUsername } }));
              }}
            >
              <div className="relative h-32 shrink-0 overflow-hidden bg-zinc-100 sm:h-auto sm:w-1/3 dark:bg-zinc-900">
                {linkedArticle.coverImage ? (
                  <Image
                    src={linkedArticle.coverImage}
                    alt={linkedArticle.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileText className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  <FileText className="h-3 w-3" />
                  <span>Article</span>
                  {linkedArticle.readTime && (
                    <>
                      <span>·</span>
                      <Clock className="h-3 w-3" />
                      <span>{linkedArticle.readTime}</span>
                    </>
                  )}
                </div>
                <h4 className="mb-1 line-clamp-2 text-[14px] font-semibold leading-snug text-zinc-900 dark:text-white">
                  {linkedArticle.title}
                </h4>
                <p className="line-clamp-2 text-[13px] text-zinc-500 dark:text-zinc-400">{linkedArticle.preview}</p>
              </div>
            </div>
          )}

          {post.hashtags && post.hashtags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
              {post.hashtags.map((tag: string) => (
                <Link
                  key={tag}
                  href={topicUrl(tag)}
                  className="text-[14px] text-blue-600 dark:text-blue-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {/* Icon-only action row. -ml-2 pulls the first icon's tap padding
              back so the glyphs still align to the text column above. */}
          <div className="-ml-2 mt-2 flex items-center text-zinc-500 dark:text-zinc-400">
            <ActionButton label="Reply" icon={MessageCircle} onClick={(e) => handleInteraction(e)} />
            <ActionButton label="Repost" icon={Repeat2} onClick={(e) => handleInteraction(e, toggleRepost)} />
            <ActionButton
              label={isLiked ? "Unlike" : "Like"}
              icon={Heart}
              isActive={isLiked}
              activeClass="text-pink-600 dark:text-pink-500"
              onClick={(e) => handleInteraction(e, toggleLike)}
            />
            <ActionButton
              label={isBookmarked ? "Remove bookmark" : "Bookmark"}
              icon={Bookmark}
              isActive={isBookmarked}
              activeClass="text-zinc-900 dark:text-white"
              onClick={(e) => handleInteraction(e, toggleBookmark)}
            />
            <ActionButton label="Share" icon={Share} onClick={(e) => handleInteraction(e)} />
          </div>

          {summary.length > 0 && (
            <div className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">{summary.join(" · ")}</div>
          )}
        </div>
      </div>
    </article>
  );
}

interface ActionButtonProps {
  label: string;
  icon: typeof Heart;
  onClick: (e: React.MouseEvent) => void;
  isActive?: boolean;
  activeClass?: string;
}

function ActionButton({ label, icon: Icon, onClick, isActive, activeClass }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      // p-2.5 on a 20px glyph gives a 44px target, the platform minimum -
      // worth more here than the tighter spacing a smaller pad would buy.
      className={cn(
        "rounded-full p-2.5 transition-transform active:scale-90 md:hover:bg-zinc-100 dark:md:hover:bg-zinc-800",
        isActive && activeClass
      )}
    >
      <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
    </button>
  );
}
