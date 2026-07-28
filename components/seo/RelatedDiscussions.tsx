"use client";

import { PostCard } from "@/components/shared/PostCard";
import { useFeed } from "@/lib/hooks/useFeed";

export function RelatedDiscussions({ currentPostId }: { currentPostId: string }) {
  const { posts } = useFeed("foryou");
  
  const related = posts.filter((p) => p.id !== currentPostId).slice(0, 2);

  if (related.length === 0) return null;

  return (
    <section className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
      <h3 className="text-xl font-bold dark:text-white mb-6 px-4 sm:px-6">Related Discussions</h3>
      <div className="space-y-4">
        {related.map((post) => (
          <div key={post.id} className="px-4 sm:px-6">
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </section>
  );
}
