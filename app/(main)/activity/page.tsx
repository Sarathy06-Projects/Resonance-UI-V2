"use client";

import { Suspense } from "react";
import useSWRInfinite from "swr/infinite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/shared/PostCard";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLikedPosts, getCommentedPosts } from "@/lib/api/users";
import { ErrorState } from "@/components/shared/ErrorState";
import type { Post } from "@/lib/api/types";

interface PostsPage {
  posts: Post[];
  nextCursor: string | null;
}

type ActivityKind = "liked" | "commented";

function useActivityPosts(kind: ActivityKind) {
  const getKey = (pageIndex: number, previousPage: PostsPage | null): [ActivityKind, string | undefined] | null => {
    if (previousPage && !previousPage.nextCursor) return null;
    const cursor = pageIndex === 0 ? undefined : (previousPage?.nextCursor ?? undefined);
    return [kind, cursor];
  };

  const fetcher = ([k, cursor]: [ActivityKind, string | undefined]) => (k === "liked" ? getLikedPosts(cursor) : getCommentedPosts(cursor));

  const { data, error, isLoading, size, setSize, mutate } = useSWRInfinite<PostsPage>(getKey, fetcher);

  const posts = data?.flatMap((page) => page.posts) ?? [];
  const hasMore = !!data && data.length > 0 && !!data[data.length - 1]?.nextCursor;
  const isLoadingMore = isLoading || (size > 0 && !!data && typeof data[size - 1] === "undefined");

  return { posts, error, isLoading, isLoadingMore, hasMore, loadMore: () => void setSize((s) => s + 1), mutate };
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto py-10 px-4 md:px-6 min-h-[80vh]" />}>
      <ActivityPageInner />
    </Suspense>
  );
}

function ActivityPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "commented" ? "commented" : "liked";
  const liked = useActivityPosts("liked");
  const commented = useActivityPosts("commented");

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 md:px-6 min-h-[80vh]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white mb-2">Your Activity</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-[17px]">Posts you&apos;ve liked and commented on.</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => router.replace(`/activity?tab=${value}`, { scroll: false })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-[300px] mb-8 bg-zinc-100/70 dark:bg-zinc-900 p-1">
          <TabsTrigger value="liked" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-950 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">
            Liked
          </TabsTrigger>
          <TabsTrigger value="commented" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-950 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">
            Commented
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liked" className="mt-0 outline-none">
          {liked.isLoading ? (
            <div className="text-center py-20 text-zinc-400">Loading…</div>
          ) : liked.error ? (
            <ErrorState title="Couldn't load liked posts" error={liked.error} onRetry={() => liked.mutate()} />
          ) : liked.posts.length > 0 ? (
            <div className="flex flex-col">
              {liked.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Heart className="w-8 h-8" />}
              title="No liked posts yet"
              subtitle="Posts you like will show up here."
              onAction={() => router.push("/explore")}
              actionLabel="Explore"
            />
          )}
          {liked.hasMore && (
            <div className="flex justify-center py-6">
              <Button variant="outline" size="sm" onClick={liked.loadMore} disabled={liked.isLoadingMore}>
                {liked.isLoadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="commented" className="mt-0 outline-none">
          {commented.isLoading ? (
            <div className="text-center py-20 text-zinc-400">Loading…</div>
          ) : commented.error ? (
            <ErrorState title="Couldn't load commented posts" error={commented.error} onRetry={() => commented.mutate()} />
          ) : commented.posts.length > 0 ? (
            <div className="flex flex-col">
              {commented.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<MessageCircle className="w-8 h-8" />}
              title="No commented posts yet"
              subtitle="Posts you've commented on will show up here."
              onAction={() => router.push("/explore")}
              actionLabel="Explore"
            />
          )}
          {commented.hasMore && (
            <div className="flex justify-center py-6">
              <Button variant="outline" size="sm" onClick={commented.loadMore} disabled={commented.isLoadingMore}>
                {commented.isLoadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  onAction,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-zinc-50/50 dark:bg-zinc-900/20 rounded-[32px] border border-dashed border-zinc-200 dark:border-zinc-800">
      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mb-6">{icon}</div>
      <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-2">{title}</h3>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-8 leading-relaxed">{subtitle}</p>
      <Button onClick={onAction} className="rounded-full px-8 shadow-sm h-11 font-medium">
        {actionLabel}
      </Button>
    </div>
  );
}
