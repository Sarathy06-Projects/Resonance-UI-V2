"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Pin, ChevronDown, ChevronUp } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { CommentInput } from "./CommentInput";
import { CommentActionsMenu } from "./comment/CommentActionsMenu";
import { ReportCommentDialog } from "./comment/ReportCommentDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import * as commentsApi from "@/lib/api/comments";
import { timeAgo } from "@/lib/formatTime";
import { renderCommentContent } from "@/lib/renderCommentContent";
import { useCommentReplies } from "@/lib/hooks/useCommentReplies";
import { useLongPress } from "@/lib/hooks/useLongPress";
import { useSwipeReply } from "@/lib/hooks/useSwipeReply";
import type { Comment, CommentReportReason } from "@/lib/api/types";
import { profileUrl, topicUrl } from "@/lib/urls";

interface CommentItemProps {
  comment: Comment;
  targetType: "post" | "article";
  targetId: string;
  viewerIsTargetAuthor: boolean;
  isAdmin: boolean;
  onChanged: () => void;
  // Called after this exact comment is permanently deleted, so whichever
  // parent list is rendering it (top-level page or a sibling's replies
  // array) can remove it. There's no soft delete/restore - once this fires
  // the comment and its entire reply subtree are gone for good.
  onDeleted?: () => void;
}

// Past this depth, replies keep nesting logically (server enforces the real
// cap) but stop growing the visual indent - avoids the classic "reply to a
// reply to a reply..." horizontal-scroll problem on deep threads.
const MAX_VISUAL_DEPTH = 4;

function CommentItemComponent({ comment, targetType, targetId, viewerIsTargetAuthor, isAdmin, onChanged, onDeleted }: CommentItemProps) {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const router = useRouter();
  // Replying and editing move into a bottom sheet on phones. Inline was fine
  // for a top-level comment and unusable for a nested one: by depth three the
  // indent has eaten most of a 390px screen, so the textarea is a slot a few
  // words wide, and it sits underneath the fixed composer bar with the
  // keyboard up. Top-level replies already used a sheet - this is the same
  // treatment for every other case, so the composer is one thing everywhere.
  const isMobile = useIsMobile();

  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLiked, setIsLiked] = useState(comment.isLiked);
  const [likesCount, setLikesCount] = useState(comment.likesCount);
  const [isPinned, setIsPinned] = useState(comment.isPinned);
  const [content, setContent] = useState(comment.content);
  const [editedAt, setEditedAt] = useState(comment.editedAt);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Reconcile local state with fresh server data.
  //
  // The like, pin and content values above are mirrored into state so a tap
  // can update instantly instead of waiting for a round trip. That mirror
  // goes stale the moment the row is refetched - a revalidation, a pin from
  // another tab, the SSE stream - because useState only reads its initial
  // value once. The previous code hid this by folding likesCount and content
  // into the React key, which forced a remount; that re-read the props but
  // also destroyed everything else the row was holding.
  //
  // Comparing against the last *props* seen, rather than against local state,
  // is what makes this safe next to optimistic updates: an echo of a change
  // the viewer just made arrives identical to what was already recorded, so
  // nothing is overwritten, while a genuinely new server value still lands.
  const [syncedFrom, setSyncedFrom] = useState(comment);
  if (
    syncedFrom.isLiked !== comment.isLiked ||
    syncedFrom.likesCount !== comment.likesCount ||
    syncedFrom.isPinned !== comment.isPinned ||
    syncedFrom.content !== comment.content ||
    syncedFrom.editedAt !== comment.editedAt
  ) {
    setSyncedFrom(comment);
    setIsLiked(comment.isLiked);
    setLikesCount(comment.likesCount);
    setIsPinned(comment.isPinned);
    setContent(comment.content);
    setEditedAt(comment.editedAt);
  }

  const {
    replies,
    hasMore,
    isLoading: isLoadingReplies,
    loadMore,
    addReply,
    removeReply,
  } = useCommentReplies(comment.id, comment.replies, comment.hasMoreReplies, comment.nextRepliesCursor);

  const isOwner = user?.id === comment.authorId;
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;
  const canReport = isAuthenticated && !isOwner;
  const canPin = !comment.parentId && viewerIsTargetAuthor;

  const handleInteraction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (action) action();
  };

  const toggleLike = async () => {
    const next = !isLiked;
    setIsLiked(next);
    setLikesCount((c) => c + (next ? 1 : -1));
    try {
      await (next ? commentsApi.likeComment(comment.id) : commentsApi.unlikeComment(comment.id));
    } catch {
      setIsLiked(!next);
      setLikesCount((c) => c + (next ? -1 : 1));
    }
  };

  const togglePin = async () => {
    setMenuOpen(false);
    try {
      const result = await commentsApi.pinComment(comment.id);
      setIsPinned(result.isPinned);
      onChanged();
    } catch {
      // no-op: state stays as it was
    }
  };

  const handleReplySubmit = async (text: string) => {
    const created = await commentsApi.createComment({ targetType, targetId, parentId: comment.id, content: text });
    setIsReplying(false);
    addReply(created);
  };

  const handleEditSubmit = async (text: string) => {
    const result = await commentsApi.editComment(comment.id, text);
    setContent(result.content);
    setEditedAt(result.editedAt);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (isDeleting) return;
    if (!window.confirm("Delete this comment? This can't be undone.")) return;
    setIsDeleting(true);
    try {
      await commentsApi.deleteComment(comment.id);
      onDeleted?.();
    } catch {
      setIsDeleting(false);
    }
  };

  const handleReport = async (reason: CommentReportReason, details?: string) => {
    await commentsApi.reportComment(comment.id, reason, details);
  };

  const longPress = useLongPress(() => setMenuOpen(true));
  const swipe = useSwipeReply(() => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setIsReplying(true);
  });
  const rowHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      swipe.handlers.onPointerDown(e);
      longPress.onPointerDown(e);
    },
    onPointerMove: (e: React.PointerEvent) => {
      swipe.handlers.onPointerMove(e);
      longPress.onPointerMove(e);
    },
    onPointerUp: (e: React.PointerEvent) => {
      swipe.handlers.onPointerUp(e);
      longPress.onPointerUp(e);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      swipe.handlers.onPointerLeave(e);
      longPress.onPointerLeave(e);
    },
  };

  // The real number, not how many happen to be loaded. The server inlines
  // only the first few, so a comment with twelve replies would otherwise
  // offer to "Show 3 replies" and look like it had lost the rest.
  // repliesCount can lag a locally-added reply by one, hence the max.
  const totalReplies = Math.max(comment.repliesCount, replies.length);
  // Replies exist but none are loaded - the server did not inline any at this
  // depth. Without this the collapse toggle expands to nothing and the "view
  // more" button, which lived inside the loaded-replies block, never rendered
  // at all: a comment with replies and no way to reach them.
  const hasUnloadedReplies = totalReplies > 0 && replies.length === 0;

  return (
    <div role="article" aria-label={`Comment by ${comment.author.name}`} className={cn("flex flex-col", isDeleting && "opacity-50 pointer-events-none")}>
      {isPinned && (
        <div className="ml-12 flex items-center gap-2 px-4 pt-3 pb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <Pin className="h-3.5 w-3.5" />
          Pinned by author
        </div>
      )}

      <div className="relative overflow-hidden">
        {swipe.translateX < 0 && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-500">
            <MessageCircle className="h-5 w-5" />
          </div>
        )}
        <motion.div
          style={{ transform: `translateX(${swipe.translateX}px)` }}
          className={cn(
            "flex gap-3 bg-white p-4 transition-colors hover:bg-zinc-50/50 sm:gap-4 sm:p-5 dark:bg-zinc-950 dark:hover:bg-zinc-900/50",
            isPinned ? "pt-2" : ""
          )}
          {...rowHandlers}
        >
          <Avatar className="mt-1 h-10 w-10 shrink-0 border border-zinc-100 dark:border-zinc-800">
            <AvatarImage src={comment.author.image ?? undefined} />
            <AvatarFallback className="dark:bg-zinc-800 dark:text-zinc-300">{comment.author.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[15px] font-bold dark:text-zinc-100">{comment.author.name}</span>
                {comment.isTargetAuthor && (
                  <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    Author
                  </span>
                )}
                {comment.author.username && (
                  <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">@{comment.author.username}</span>
                )}
                <span className="ml-1 text-sm text-zinc-500 dark:text-zinc-400">· {timeAgo(comment.createdAt)}</span>
                {editedAt && <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">(edited)</span>}
              </div>

              <CommentActionsMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                canEdit={canEdit}
                canDelete={canDelete}
                canReport={canReport}
                canPin={canPin}
                isPinned={isPinned}
                isAdminAction={isAdmin && !isOwner}
                onEdit={() => {
                  setMenuOpen(false);
                  setIsEditing(true);
                }}
                onDelete={handleDelete}
                onReport={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
                onTogglePin={togglePin}
              />
            </div>

            {isEditing && !isMobile ? (
              <CommentInput
                targetType={targetType}
                targetId={targetId}
                parentId={comment.id}
                isEdit
                initialContent={content}
                submitLabel="Save"
                onSubmit={handleEditSubmit}
                onCancel={() => setIsEditing(false)}
                autoFocus
              />
            ) : (
              <p className="mb-2 text-[15px] leading-normal whitespace-pre-wrap text-zinc-900 dark:text-zinc-200">
                {renderCommentContent(content, {
                  onMentionClick: (username) => router.push(profileUrl({ username })),
                  onHashtagClick: (tag) => router.push(topicUrl(tag)),
                })}
              </p>
            )}

            {!(isEditing && !isMobile) && (
              <div className="mt-1 flex items-center gap-6">
                <button
                  onClick={(e) => handleInteraction(e, toggleLike)}
                  aria-label={isLiked ? "Unlike comment" : "Like comment"}
                  aria-pressed={isLiked}
                  className={cn(
                    "group flex items-center gap-1.5 transition-colors",
                    isLiked ? "text-pink-600 dark:text-pink-500" : "text-zinc-500 hover:text-pink-500 dark:hover:text-pink-400"
                  )}
                >
                  <div
                    className={cn(
                      "-ml-1.5 rounded-full p-1.5 transition-colors",
                      isLiked ? "bg-pink-50/50 dark:bg-pink-500/10" : "group-hover:bg-pink-50 dark:group-hover:bg-pink-500/10"
                    )}
                  >
                    <motion.span whileTap={{ scale: 1.3 }} className="inline-flex">
                      <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                    </motion.span>
                  </div>
                  <span className="text-xs font-medium">{likesCount}</span>
                </button>

                <button
                  onClick={(e) => handleInteraction(e, () => setIsReplying((v) => !v))}
                  aria-label="Reply"
                  aria-expanded={isReplying}
                  className="group flex items-center gap-1.5 text-zinc-500 transition-colors hover:text-blue-500 dark:hover:text-blue-400"
                >
                  <div className="-ml-1.5 rounded-full p-1.5 transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium">Reply</span>
                </button>

                {totalReplies > 0 && (
                  <button
                    onClick={() => {
                      // Nothing loaded yet means this is a fetch, not a
                      // toggle - expanding an empty list would just collapse
                      // onto nothing.
                      if (hasUnloadedReplies) {
                        setCollapsed(false);
                        void loadMore();
                        return;
                      }
                      setCollapsed((v) => !v);
                    }}
                    disabled={isLoadingReplies}
                    aria-expanded={!collapsed && replies.length > 0}
                    className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 disabled:opacity-60 dark:hover:text-zinc-300"
                  >
                    {collapsed || hasUnloadedReplies ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                    {isLoadingReplies
                      ? "Loading…"
                      : collapsed || hasUnloadedReplies
                        ? `Show ${totalReplies} ${totalReplies === 1 ? "reply" : "replies"}`
                        : "Hide replies"}
                  </button>
                )}

                {comment.likedByCreator && (
                  <div className="ml-auto flex items-center">
                    <div className="group relative flex cursor-pointer items-center">
                      <div className="absolute -right-1 -bottom-1 z-20 rounded-full bg-white dark:bg-zinc-900 p-[2px] shadow-sm">
                        <Heart className="h-2.5 w-2.5 fill-pink-500 text-pink-500" />
                      </div>
                      <div className="pointer-events-none absolute -top-7 right-0 rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                        Liked by author
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {isReplying && !isMobile && (
        <div className="mr-4 ml-6 border-l-2 border-zinc-100 pr-4 pl-12 sm:ml-9 sm:pl-16 dark:border-zinc-800">
          <CommentInput
            targetType={targetType}
            targetId={targetId}
            parentId={comment.id}
            onSubmit={handleReplySubmit}
            onCancel={() => setIsReplying(false)}
            placeholder={`Reply to ${comment.author.name}`}
            autoFocus
          />
        </div>
      )}

      {/* Mobile reply and edit. Full-width sheet rather than a textarea nested
          inside the indent, and it names who is being replied to - once the
          composer is detached from the row it was opened from, that context
          is otherwise gone. Only mounted on mobile, so there is never a second
          composer competing for focus or writing the same draft key. */}
      {isMobile && (
        <Sheet
          open={isReplying || isEditing}
          onOpenChange={(open) => {
            if (open) return;
            setIsReplying(false);
            setIsEditing(false);
          }}
        >
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{isEditing ? "Edit comment" : `Reply to ${comment.author.name}`}</SheetTitle>
            </SheetHeader>
            {isEditing ? (
              <CommentInput
                targetType={targetType}
                targetId={targetId}
                parentId={comment.id}
                isEdit
                initialContent={content}
                submitLabel="Save"
                onSubmit={handleEditSubmit}
                onCancel={() => setIsEditing(false)}
                autoFocus
              />
            ) : (
              <CommentInput
                targetType={targetType}
                targetId={targetId}
                parentId={comment.id}
                onSubmit={handleReplySubmit}
                onCancel={() => setIsReplying(false)}
                placeholder={`Reply to ${comment.author.name}`}
                autoFocus
              />
            )}
          </SheetContent>
        </Sheet>
      )}

      <AnimatePresence initial={false}>
        {!collapsed && replies.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div
              className={cn(
                "relative",
                comment.depth < MAX_VISUAL_DEPTH ? "ml-6 border-l-2 border-zinc-100 pl-6 sm:ml-9 sm:pl-9 dark:border-zinc-800" : ""
              )}
            >
              <div className="absolute -bottom-4 -left-0.5 h-6 w-1 bg-white dark:bg-zinc-950" />
              {replies.map((reply) => (
                // Keyed on id alone. It used to fold likesCount, isPinned and
                // content.length into the key, which meant liking a reply
                // changed its key: React unmounted the subtree and built a new
                // one, throwing away an open reply box, any deeper replies
                // that had been loaded, and the collapse state, with a visible
                // flash. CommentItem already mirrors those fields into local
                // state, so it re-renders on change without being replaced.
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  targetType={targetType}
                  targetId={targetId}
                  viewerIsTargetAuthor={viewerIsTargetAuthor}
                  isAdmin={isAdmin}
                  onChanged={onChanged}
                  onDeleted={() => removeReply(reply.id)}
                />
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={isLoadingReplies}
                  className="my-2 ml-6 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50 sm:ml-9 dark:text-blue-400"
                >
                  {isLoadingReplies
                    ? "Loading…"
                    : `View ${Math.max(comment.repliesCount - replies.length, 1)} more ${comment.repliesCount - replies.length === 1 ? "reply" : "replies"}`}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReportCommentDialog open={reportOpen} onOpenChange={setReportOpen} onSubmit={handleReport} />
    </div>
  );
}

export const CommentItem = memo(CommentItemComponent);
