"use client";

import { use } from "react";
import useSWR, { mutate } from "swr";
import { PostCard } from "@/components/shared/PostCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CommentInput } from "@/components/shared/CommentInput";
import { CommentThread } from "@/components/shared/CommentThread";
import { getPost } from "@/lib/api/posts";
import { createComment } from "@/lib/api/comments";
import { JsonLd } from "@/components/seo/JsonLd";
import { RelatedDiscussions } from "@/components/seo/RelatedDiscussions";

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: post, isLoading, error } = useSWR(`post-${resolvedParams.id}`, () => getPost(resolvedParams.id));

  const handleMainReplySubmit = async (content: string) => {
    await createComment({ targetType: "post", targetId: resolvedParams.id, content });
    mutate(`comments-post-${resolvedParams.id}`);
  };

  return (
    <main className="flex flex-col min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 sm:top-16 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-6">
        <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors dark:text-zinc-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight dark:text-white">Post</h1>
      </div>

      {isLoading && (
        <div className="p-6 text-center text-zinc-400">Loading post…</div>
      )}

      {error && !isLoading && (
        <div className="p-10 text-center text-zinc-500">This post couldn&apos;t be found.</div>
      )}

      {post && (
        <article>
          <JsonLd data={{
            "@context": "https://schema.org",
            "@type": "DiscussionForumPosting",
            "headline": `Post by ${post.author.name}`,
            "author": {
              "@type": "Person",
              "name": post.author.name,
              "url": `https://resonance.design/profile/${post.author.username}`
            },
            "datePublished": post.createdAt,
            "articleBody": post.content
          }} />
          <div className="border-b border-zinc-100 dark:border-zinc-800 pt-2 pb-4">
            <PostCard post={post} isDetailed />
          </div>

          <div className="border-b border-zinc-100 dark:border-zinc-800">
            <CommentInput onSubmit={handleMainReplySubmit} />
          </div>

          <CommentThread targetType="post" targetId={post.id} targetAuthorId={post.authorId} />
          <RelatedDiscussions currentPostId={post.id} />
        </article>
      )}
    </main>
  );
}
