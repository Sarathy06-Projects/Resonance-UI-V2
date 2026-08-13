"use client";

import { PostCard } from "@/components/shared/PostCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CommentThread } from "@/components/shared/CommentThread";
import type { Post } from "@/lib/api/types";

export function PostDetailView({ post }: { post: Post }) {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Desktop-only header. On mobile this is a pushed screen, so the back
          chevron and "Thread" title come from MobileHeader (see
          lib/mobile/nav.ts) - rendering a second one here would stack two
          title bars above the post. */}
      <div className="sticky top-0 z-10 hidden items-center gap-6 border-b border-zinc-100 bg-white/80 px-4 py-3 backdrop-blur-xl md:flex dark:border-zinc-800 dark:bg-zinc-950/80">
        <Link href="/" className="rounded-full p-2 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight dark:text-white">Post</h1>
      </div>

      <article>
        <div className="border-b border-zinc-100 dark:border-zinc-800">
          {post.thread && post.thread.length > 1 ? (
            post.thread.map((segment) => (
              <PostCard key={segment.id} post={segment} isDetailed={segment.id === post.id} />
            ))
          ) : (
            <PostCard post={post} isDetailed />
          )}
        </div>

        <CommentThread targetType="post" targetId={post.id} targetAuthorId={post.authorId} />
      </article>
    </main>
  );
}
