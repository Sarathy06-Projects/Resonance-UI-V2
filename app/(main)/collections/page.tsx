"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/shared/PostCard";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { mockPosts, mockArticles } from "@/lib/mock-data";
import { Bookmark, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function CollectionsPage() {
  const router = useRouter();
  
  // Mock data for the collections
  const savedPosts = mockPosts; 
  const savedArticles = mockArticles;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 md:px-6 min-h-[80vh]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white mb-2">Collections</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-[17px]">Your saved inspiration, organized in one place.</p>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[300px] mb-8 bg-zinc-100/70 dark:bg-zinc-900 p-1">
          <TabsTrigger value="posts" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-950 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">Saved Posts</TabsTrigger>
          <TabsTrigger value="articles" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-950 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">Saved Articles</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0 outline-none">
          {savedPosts.length > 0 ? (
            <div className="flex flex-col">
              {savedPosts.map(post => (
                <div key={post.id} className="relative group">
                  <PostCard post={post} />
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden sm:block">
                    <Button variant="secondary" size="sm" className="bg-white/95 dark:bg-zinc-800/95 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs shadow-sm font-medium" onClick={(e) => { e.preventDefault(); }}>
                      Remove from Saved
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              title="No saved content yet" 
              subtitle="Save posts and articles to build your personal design library." 
              onAction={() => router.push("/explore")}
              actionLabel="Explore"
            />
          )}
        </TabsContent>

        <TabsContent value="articles" className="mt-0 outline-none">
          {savedArticles.length > 0 ? (
            <div className="flex flex-wrap gap-6">
              {savedArticles.map(article => (
                <div key={article.id} className="relative group">
                  <ArticleCard article={article} />
                  <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="secondary" size="sm" className="bg-white/95 dark:bg-zinc-800/95 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs shadow-sm font-medium" onClick={(e) => { e.preventDefault(); }}>
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
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-zinc-50/50 dark:bg-zinc-900/20 rounded-[32px] border border-dashed border-zinc-200 dark:border-zinc-800">
      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
        <Bookmark className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-2">{title}</h3>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-8 leading-relaxed">{subtitle}</p>
      <Button onClick={onAction} className="rounded-full px-8 shadow-sm h-11 font-medium">
        {actionLabel}
      </Button>
    </div>
  );
}
