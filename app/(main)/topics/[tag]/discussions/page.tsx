import { Metadata } from "next";
import Link from "next/link";
import { Hash, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/shared/PostCard";
import { getHashtagPosts } from "@/lib/api/hashtags";
import { topicUrl } from "@/lib/urls";
import { constructMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ cursor?: string }>;
};

// Own generateMetadata (rather than inheriting the parent hub layout's)
// because canonical must vary per page - this is real, distinct listing
// content, not an alternate view of the hub at /topics/:tag.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const { cursor } = await searchParams;
  const tag = decodeURIComponent(rawTag);
  const canonical = `${topicUrl(tag)}/discussions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`;

  return constructMetadata({
    title: `#${tag} Discussions - Resonance`,
    description: `Browse discussions tagged #${tag} on Resonance.`,
    canonical,
  });
}

// Server-rendered per page (real crawlable ?cursor= pagination below), not
// a client-side "load more" - a crawler needs an actual link to reach
// content past the first page, and the deep-pagination pages this produces
// still aren't in the sitemap (only the hub is), matching the thin/low-
// value-page guard used elsewhere in this app.
export default async function TopicDiscussionsPage({ params, searchParams }: Props) {
  const { tag: rawTag } = await params;
  const { cursor } = await searchParams;
  const tag = decodeURIComponent(rawTag);

  const { posts, nextCursor } = await getHashtagPosts(tag, cursor ?? null).catch(() => ({ posts: [], nextCursor: null }));

  return (
    <main className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0">
      <div className="sticky top-0 sm:top-16 z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800">
        <div className="px-4 py-4 sm:px-6 flex items-center gap-4">
          <Link href={topicUrl(tag)}>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0">
              <ArrowLeft className="w-5 h-5 dark:text-zinc-200" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight dark:text-white flex items-center gap-1">
              <span className="text-zinc-400 font-medium">#</span>
              {tag} — Discussions
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{posts.length} {posts.length === 1 ? "post" : "posts"}{cursor ? " on this page" : ""}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full pt-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
              <Hash className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 dark:text-white">No posts found</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">There are currently no discussions using the #{tag} hashtag.</p>
          </div>
        ) : (
          <div className="space-y-4 px-0 sm:px-4">
            {posts.map((post) => (
              <div key={post.id} className="border-b border-zinc-100 dark:border-zinc-800/60 sm:border-0">
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )}

        {nextCursor && (
          <div className="flex justify-center py-8">
            <Link href={`${topicUrl(tag)}/discussions?cursor=${encodeURIComponent(nextCursor)}`}>
              <Button variant="outline" className="rounded-full">
                Next page <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
