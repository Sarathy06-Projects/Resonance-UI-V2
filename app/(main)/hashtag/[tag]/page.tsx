"use client";

import { use } from "react";
import useSWR from "swr";
import { PostCard } from "@/components/shared/PostCard";
import { Hash, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getHashtagPosts } from "@/lib/api/hashtags";
import { JsonLd } from "@/components/seo/JsonLd";

export default function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const resolvedParams = use(params);
  const tagName = decodeURIComponent(resolvedParams.tag);

  const { data, isLoading } = useSWR(`hashtag-${tagName}`, () => getHashtagPosts(tagName));
  const posts = data?.posts ?? [];

  const hashtagJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `#${tagName} - Resonance`,
    "url": `https://resonance.design/hashtag/${tagName}`
  };

  return (
    <main className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0">
      <JsonLd data={hashtagJsonLd} />

      <div className="sticky top-0 sm:top-16 z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800">
        <div className="px-4 py-4 sm:px-6 flex items-center gap-4">
          <Link href="/explore">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0">
              <ArrowLeft className="w-5 h-5 dark:text-zinc-200" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight dark:text-white flex items-center gap-1">
              <span className="text-zinc-400 font-medium">#</span>
              {tagName}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isLoading ? "Loading…" : `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full pt-6">
        {!isLoading && posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
              <Hash className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 dark:text-white">No posts found</h2>
            <p className="text-zinc-500 max-w-sm">There are currently no discussions using the #{tagName} hashtag.</p>
          </div>
        ) : (
          <div className="space-y-4 px-0 sm:px-4">
            {posts.map(post => (
              <div key={post.id} className="border-b border-zinc-100 dark:border-zinc-800/60 sm:border-0">
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}
