"use client";

import { PostCard } from "@/components/shared/PostCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CommentThread } from "@/components/shared/CommentThread";
import { RelatedDiscussions } from "@/components/seo/RelatedDiscussions";
import type { Post } from "@/lib/api/types";

export function PostDetailView({ post }: { post: Post }) {
  return (
    <main className="flex flex-col min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 sm:top-16 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-6">
        <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors dark:text-zinc-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight dark:text-white">Post</h1>
      </div>

      <article>
        <div className="border-b border-zinc-100 dark:border-zinc-800 pt-2 pb-4">
          {post.thread && post.thread.length > 1 ? (
            post.thread.map((segment) => (
              <PostCard key={segment.id} post={segment} isDetailed={segment.id === post.id} />
            ))
          ) : (
            <PostCard post={post} isDetailed />
          )}
        </div>

        <CommentThread targetType="post" targetId={post.id} targetAuthorId={post.authorId} />
        <RelatedDiscussions currentPostId={post.id} />
      </article>
    </main>
  );
}
