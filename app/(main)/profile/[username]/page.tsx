"use client";

import { use, useRef, useState } from "react";
import useSWR from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/shared/PostCard";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { useAuthStore } from "@/store/useAuthStore";
import { useFollowState } from "@/lib/hooks/useFollowState";
import { getProfile, uploadAvatar, uploadCover } from "@/lib/api/users";
import { getUserPosts } from "@/lib/api/posts";
import { getUserArticles } from "@/lib/api/articles";
import { formatCount } from "@/lib/formatCount";
import { joinedDate } from "@/lib/formatTime";
import {
  MapPin, Link as LinkIcon, Calendar, CheckCircle2,
  PenTool, Eye, Bookmark, MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import type { Profile } from "@/lib/api/types";

const TABS = [
  { id: "posts", label: "Posts" },
  { id: "articles", label: "Articles" },
  { id: "collections", label: "Collections" },
  { id: "likes", label: "Likes" },
  { id: "media", label: "Media" },
  { id: "about", label: "About" },
];

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const { data: profile, isLoading, error, mutate } = useSWR(`profile-${resolvedParams.username}`, () => getProfile(resolvedParams.username));

  if (isLoading) return <div className="p-10 text-center text-zinc-400">Loading profile…</div>;
  if (error || !profile) return <div className="p-10 text-center text-zinc-500">This profile couldn&apos;t be found.</div>;

  return <ProfileView profile={profile} onProfileChanged={() => mutate()} />;
}

function ProfileView({ profile, onProfileChanged }: { profile: Profile; onProfileChanged: () => void }) {
  const { isAuthenticated, openAuthModal } = useAuthStore();
  const { isFollowing, toggleFollow } = useFollowState(profile.id, profile.isFollowing);
  const [activeTab, setActiveTab] = useState("posts");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: postsData } = useSWR(activeTab === "posts" ? `profile-posts-${profile.id}` : null, () => getUserPosts(profile.id));
  const { data: articlesData } = useSWR(activeTab === "articles" ? `profile-articles-${profile.id}` : null, () => getUserArticles(profile.id));

  const handleInteraction = () => {
    if (!isAuthenticated) openAuthModal();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadAvatar(file);
      onProfileChanged();
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadCover(file);
      onProfileChanged();
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": profile.name,
    "url": `https://resonance.design/profile/${profile.username}`,
    "image": profile.image,
    "description": profile.bio,
    "jobTitle": profile.role,
    "worksFor": {
      "@type": "Organization",
      "name": profile.company
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0 w-full overflow-x-hidden">
      <JsonLd data={personJsonLd} />

      {/* Cover Banner */}
      <div className="h-48 sm:h-72 w-full relative group bg-zinc-100 dark:bg-zinc-900">
        {profile.coverImage && <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {profile.isSelf && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            <Button
              variant="secondary" size="sm" disabled={isUploading}
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white border-none transition-all"
            >
              Change Cover
            </Button>
          </>
        )}
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row gap-8 lg:gap-12 relative -mt-12 sm:-mt-16 z-10 pb-12">
        <div className="flex-1 min-w-0">

          <div className="flex justify-between items-end mb-4">
            <div className="relative group/avatar">
              <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white dark:border-zinc-950 shadow-lg bg-white dark:bg-zinc-900 rounded-3xl">
                <AvatarImage src={profile.image ?? undefined} className="rounded-3xl object-cover" />
                <AvatarFallback className="rounded-3xl text-3xl font-bold">{profile.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {profile.verified && (
                <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-1.5 rounded-full border-4 border-white dark:border-zinc-950 shadow-sm" title="Verified Designer">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
              {profile.isSelf && (
                <>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity text-white text-xs font-semibold"
                  >
                    Change
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-3 mb-2">
              {profile.isSelf ? (
                <Button variant="outline" nativeButton={false} className="rounded-full font-semibold px-6 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 shadow-sm" render={<Link href="/settings/profile" />}>
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="icon" className="rounded-full w-10 h-10 shadow-sm dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    className="rounded-full font-semibold px-8 shadow-sm transition-transform active:scale-95 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    onClick={() => (isAuthenticated ? toggleFollow() : openAuthModal())}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight dark:text-white flex items-center gap-2">
                {profile.name}
              </h1>
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mt-1">
                <span className="text-[15px] font-medium">@{profile.username}</span>
                {profile.role && (
                  <>
                    <span>·</span>
                    <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-300">
                      {profile.role}{profile.company ? ` at ${profile.company}` : ""}
                    </span>
                  </>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="text-[16px] leading-relaxed max-w-2xl text-zinc-700 dark:text-zinc-300">
                {profile.bio}
              </p>
            )}

            {profile.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.badges.map((badge) => (
                  <div key={badge} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-transparent bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {badge}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium pt-2">
              {profile.location && <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {profile.location}</div>}
              {profile.websiteUrl && (
                <div className="flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4" />
                  <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    {profile.websiteUrl.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Joined {joinedDate(profile.createdAt)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
            {[
              { label: "Posts", val: profile.postsCount },
              { label: "Articles", val: profile.articlesCount },
              { label: "Followers", val: profile.followersCount },
              { label: "Following", val: profile.followingCount },
              { label: "Total Likes", val: profile.totalLikesCount },
              { label: "Article Reads", val: profile.articleReadsCount },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-xl font-bold dark:text-white">{formatCount(stat.val)}</span>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="border-b border-zinc-100 dark:border-zinc-800 mb-6">
            <div className="flex gap-6 overflow-x-auto no-scrollbar relative">
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative py-4 text-[15px] font-semibold whitespace-nowrap transition-colors flex items-center gap-2",
                      isActive ? "text-zinc-950 dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    )}
                  >
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-950 dark:bg-white rounded-t-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-[400px]">
            {activeTab === "posts" && (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 -mx-4 sm:mx-0 sm:border sm:border-zinc-100 sm:dark:border-zinc-800/60 sm:rounded-3xl sm:overflow-hidden bg-white dark:bg-zinc-950">
                {postsData?.posts.length ? (
                  postsData.posts.map((post) => <PostCard key={post.id} post={post} />)
                ) : (
                  <EmptyTab label="posts" name={profile.name} />
                )}
              </div>
            )}

            {activeTab === "articles" && (
              <div className="space-y-6">
                {articlesData?.articles.length ? (
                  articlesData.articles.map((article) => (
                    <div key={article.id} className="group flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-3xl transition-all hover:shadow-sm bg-white dark:bg-zinc-950">
                      <Link href={`/article/${article.id}`} className="w-full sm:w-[240px] h-48 sm:h-[160px] shrink-0 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 block">
                        {article.coverImage && <img src={article.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                      </Link>
                      <div className="flex flex-col flex-1 min-w-0 py-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                          {article.tags?.[0] && <span>{article.tags[0]}</span>}
                          {article.readTime && <><span>·</span><span>{article.readTime}</span></>}
                        </div>
                        <Link href={`/article/${article.id}`}>
                          <h2 className="text-xl font-bold dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {article.title}
                          </h2>
                        </Link>
                        <p className="text-zinc-500 dark:text-zinc-400 text-[15px] line-clamp-2 mb-4">{article.preview}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex gap-4 text-zinc-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1.5 text-sm font-medium"><Eye className="w-4 h-4" /> {formatCount(article.viewsCount)}</span>
                            <span className="flex items-center gap-1.5 text-sm font-medium"><Bookmark className="w-4 h-4" /> {formatCount(article.bookmarksCount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyTab label="articles" name={profile.name} />
                )}
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-12">
                {profile.toolbox.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                      <PenTool className="w-5 h-5 text-zinc-400" /> Designer Toolbox
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {profile.toolbox.map(tool => (
                        <span key={tool} className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl text-[15px] font-semibold dark:text-zinc-200">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {profile.interests.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold dark:text-white mb-4">Interests</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {profile.interests.map(interest => (
                        <span key={interest} className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-xl text-[15px] font-semibold">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {profile.toolbox.length === 0 && profile.interests.length === 0 && (
                  <EmptyTab label="about info" name={profile.name} />
                )}
              </div>
            )}

            {["collections", "likes", "media"].includes(activeTab) && (
              <EmptyTab label={activeTab} name={profile.name} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function EmptyTab({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
        <Eye className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
      </div>
      <h3 className="text-lg font-bold dark:text-white mb-2">Nothing to show yet</h3>
      <p className="text-zinc-500 max-w-sm">When {name.split(' ')[0]} adds {label}, it will appear on this tab.</p>
    </div>
  );
}
