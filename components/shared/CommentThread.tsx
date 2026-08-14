"use client";

import { useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion } from "framer-motion";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import { CommentSortMenu } from "./comment/CommentSortMenu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuthStore } from "@/store/useAuthStore";
import { useCommentThread } from "@/lib/hooks/useCommentThread";
import { useCommentStream } from "@/lib/hooks/useCommentStream";
import { ErrorState } from "@/components/shared/ErrorState";
import * as commentsApi from "@/lib/api/comments";

interface CommentThreadProps {
  targetType: "post" | "article";
  targetId: string;
  targetAuthorId: string;
}

// Below this many top-level comments, plain DOM rendering is simpler and
// plenty fast; past it, window-virtualize so a viral thread with hundreds
// of top-level comments doesn't balloon the DOM. Uses useWindowVirtualizer
// (not a fixed-height scroll container) so the page keeps its natural
// document scroll instead of introducing nested scrolling.
const VIRTUALIZE_THRESHOLD = 30;

export function CommentThread({ targetType, targetId, targetAuthorId }: CommentThreadProps) {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const viewerIsTargetAuthor = user?.id === targetAuthorId;
  const isAdmin = user?.role === "admin";
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false);

  const { comments, sort, setSort, hasMore, loadMore, isLoading, isLoadingMore, error, mutate } = useCommentThread({ targetType, targetId });
  useCommentStream(targetType, targetId, mutate);

  const composerPlaceholder = targetType === "article" ? "Share your thoughts on this article" : "Post your reply";

  const handleTopLevelSubmit = async (content: string) => {
    const created = await commentsApi.createComment({ targetType, targetId, content });
    await mutate(
      (pages) => {
        if (!pages || pages.length === 0) return pages;
        return pages.map((page, i) => (i === 0 ? { ...page, comments: [created, ...page.comments] } : page));
      },
      { revalidate: false }
    );
  };

  const removeTopLevelComment = (id: string) => {
    void mutate(
      (pages) => pages?.map((page) => ({ ...page, comments: page.comments.filter((c) => c.id !== id) })),
      { revalidate: false }
    );
  };

  const handleMobileTrigger = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setMobileComposerOpen(true);
  };

  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = comments.length > VIRTUALIZE_THRESHOLD;
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    if (shouldVirtualize && parentRef.current) setScrollMargin(parentRef.current.offsetTop);
  }, [shouldVirtualize]);

  const virtualizer = useWindowVirtualizer({
    count: shouldVirtualize ? comments.length : 0,
    estimateSize: () => 140,
    overscan: 6,
    scrollMargin,
  });

  return (
    // Bottom padding clears the fixed mobile composer bar so the last comment
    // in a thread is fully readable rather than sitting behind it.
    <div className="pb-20 sm:pb-0">
      <div className="hidden border-b border-zinc-100 sm:block dark:border-zinc-800">
        <CommentInput targetType={targetType} targetId={targetId} onSubmit={handleTopLevelSubmit} placeholder={composerPlaceholder} />
      </div>

      {/* A thread view is a pushed screen, so the tab bar steps aside and
          this composer owns the bottom edge outright (see lib/mobile/nav.ts).
          --mobile-tabbar-height is published as 0 on pushed routes, so this
          sits flush to the bottom here and still stacks correctly above the
          bar on any root route that ever renders a thread inline. */}
      <button
        type="button"
        onClick={handleMobileTrigger}
        aria-label={composerPlaceholder}
        className="fixed inset-x-0 bottom-[var(--mobile-tabbar-height)] z-40 flex items-center gap-3 border-t border-zinc-100 bg-white/95 px-4 py-3 pb-[max(0.75rem,var(--safe-bottom))] text-left backdrop-blur-xl sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
      >
        <Avatar className="h-8 w-8 border border-zinc-100 dark:border-zinc-800">
          {isAuthenticated && user ? (
            <AvatarImage src={user.avatar} alt="" />
          ) : (
            <AvatarFallback className="bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">?</AvatarFallback>
          )}
        </Avatar>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{composerPlaceholder}</span>
      </button>

      <Sheet open={mobileComposerOpen} onOpenChange={setMobileComposerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{targetType === "article" ? "Comment on this article" : "Reply"}</SheetTitle>
          </SheetHeader>
          <CommentInput
            targetType={targetType}
            targetId={targetId}
            onSubmit={async (content) => {
              await handleTopLevelSubmit(content);
              setMobileComposerOpen(false);
            }}
            placeholder={composerPlaceholder}
            autoFocus
          />
        </SheetContent>
      </Sheet>

      {comments.length > 0 && (
        <div className="flex items-center justify-end border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
          <CommentSortMenu value={sort} onChange={setSort} />
        </div>
      )}

      {isLoading && comments.length === 0 && !error && (
        <div className="flex flex-col gap-4 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && comments.length === 0 && (
        <ErrorState title="Couldn't load comments" error={error} onRetry={() => mutate()} className="min-h-0 py-12" />
      )}

      {!isLoading && !error && comments.length === 0 && (
        <div className="p-8 text-center text-[15px] text-zinc-500 dark:text-zinc-400">No comments yet. Be the first to share your thoughts!</div>
      )}

      {!error && shouldVirtualize ? (
        <div ref={parentRef} style={{ position: "relative", height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((row) => {
            const comment = comments[row.index];
            return (
              <div
                key={comment.id}
                data-index={row.index}
                ref={virtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${row.start - scrollMargin}px)` }}
                className="border-b border-zinc-100 dark:border-zinc-800"
              >
                <CommentItem
                  comment={comment}
                  targetType={targetType}
                  targetId={targetId}
                  viewerIsTargetAuthor={viewerIsTargetAuthor}
                  isAdmin={isAdmin}
                  onChanged={() => mutate()}
                  onDeleted={() => removeTopLevelComment(comment.id)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {comments.map((comment) => (
              <motion.div key={comment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <CommentItem
                  comment={comment}
                  targetType={targetType}
                  targetId={targetId}
                  viewerIsTargetAuthor={viewerIsTargetAuthor}
                  isAdmin={isAdmin}
                  onChanged={() => mutate()}
                  onDeleted={() => removeTopLevelComment(comment.id)}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {hasMore && (
        <div className="flex justify-center p-4">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading…" : "Load more comments"}
          </Button>
        </div>
      )}
    </div>
  );
}
