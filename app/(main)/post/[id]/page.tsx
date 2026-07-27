"use client";

import { use } from "react";
import { PostCard } from "@/components/shared/PostCard";
import { useDataStore } from "@/store/useDataStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CommentInput } from "@/components/shared/CommentInput";
import { CommentThread } from "@/components/shared/CommentThread";

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { posts, addComment } = useDataStore();
  const { user } = useAuthStore();
  
  // Find post or fallback to first
  const post = posts.find(p => p.id === resolvedParams.id) || posts[0];

  const handleMainReplySubmit = (content: string) => {
    if (user) {
      addComment(post.id, content, user);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 sm:top-16 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-6">
        <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors dark:text-zinc-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight dark:text-white">Post</h1>
      </div>

      <div className="border-b border-zinc-100 dark:border-zinc-800 pt-2 pb-4">
        <PostCard post={post} isDetailed />
      </div>

      {/* Reply Input */}
      <div className="border-b border-zinc-100 dark:border-zinc-800">
        <CommentInput onSubmit={handleMainReplySubmit} />
      </div>

      {/* Comments / Replies */}
      <CommentThread postId={post.id} postAuthorId={post.author.id} />
    </div>
  );
}
