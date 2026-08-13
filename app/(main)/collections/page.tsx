"use client";

import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/shared/PostCard";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getBookmarkedArticles, getBookmarkedPosts } from "@/lib/api/users";
import { unbookmarkArticle } from "@/lib/api/articles";
import { unbookmarkPost } from "@/lib/api/posts";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/layout/PageHeader";

export default function CollectionsPage() {
  const router = useRouter();
  const { data: postsData, error: postsError, isLoading: postsLoading, mutate: mutatePosts } = useSWR("saved-posts", getBookmarkedPosts);
  const { data: articlesData, error: articlesError, isLoading: articlesLoading, mutate: mutateArticles } = useSWR("saved-articles", getBookmarkedArticles);

  const savedPosts = postsData?.posts ?? [];
  const savedArticles = articlesData?.articles ?? [];

  const removePost = async (id: string) => {
    await unbookmarkPost(id);
    mutatePosts();
  };

  const removeArticle = async (id: string) => {
    await unbookmarkArticle(id);
    mutateArticles();
  };

  return (
    <div className="min-h-[80vh] px-4 py-6 md:px-6">
      {/* Negative margins pull the header out to the column edges so its rule
          spans the full width, while the page keeps its own padding. */}
      <PageHeader
        title="Saved"
        description="Posts and articles you have bookmarked."
        className="-mx-4 mb-6 md:-mx-6"
      />

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[300px] mb-8 bg-zinc-100/70 dark:bg-zinc-900 p-1">
          <TabsTrigger value="posts" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-950 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">Saved Posts</TabsTrigger>
          <TabsTrigger value="articles" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-950 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">Saved Articles</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0 outline-none">
          {postsLoading ? (
            <div className="text-center py-20 text-zinc-400">Loading…</div>
          ) : postsError ? (
            <ErrorState title="Couldn't load saved posts" error={postsError} onRetry={() => mutatePosts()} />
          ) : savedPosts.length > 0 ? (
            <div className="flex flex-col">
              {savedPosts.map(post => (
                <div key={post.id} className="relative group">
                  <PostCard post={post} />
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden sm:block">
                    <Button variant="secondary" size="sm" className="bg-white/95 dark:bg-zinc-800/95 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs shadow-sm font-medium" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removePost(post.id); }}>
                      Remove from Saved
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No saved content yet"
              subtitle="Save posts to build your personal design library."
              onAction={() => router.push("/explore")}
              actionLabel="Explore"
            />
          )}
        </TabsContent>

        <TabsContent value="articles" className="mt-0 outline-none">
          {articlesLoading ? (
            <div className="text-center py-20 text-zinc-400">Loading…</div>
          ) : articlesError ? (
            <ErrorState title="Couldn't load saved articles" error={articlesError} onRetry={() => mutateArticles()} />
          ) : savedArticles.length > 0 ? (
            <div className="flex flex-wrap gap-6">
              {savedArticles.map(article => (
                <div key={article.id} className="relative group">
                  <ArticleCard article={article} />
                  <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="secondary" size="sm" className="bg-white/95 dark:bg-zinc-800/95 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs shadow-sm font-medium" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeArticle(article.id); }}>
                      Remove from Saved
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No saved articles yet"
              subtitle="Save articles to read them later."
              onAction={() => router.push("/explore")}
              actionLabel="Explore Articles"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ title, subtitle, onAction, actionLabel }: { title: string, subtitle: string, onAction: () => void, actionLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-zinc-50/50 dark:bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
      <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-2xl flex items-center justify-center mb-6">
        <Bookmark className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-zinc-950 dark:text-white mb-2">{title}</h3>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-8 leading-relaxed">{subtitle}</p>
      <Button onClick={onAction} className="rounded-full px-8 shadow-sm h-11 font-medium">
        {actionLabel}
      </Button>
    </div>
  );
}
