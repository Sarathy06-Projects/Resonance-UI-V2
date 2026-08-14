"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/shared/PostCard";
import { ProfileMenuSheet } from "@/components/profile/ProfileMenuSheet";
import { openConversation } from "@/lib/api/chat";
import { useAuthStore } from "@/store/useAuthStore";
import { useFollowState } from "@/lib/hooks/useFollowState";
import { uploadAvatar, uploadCover } from "@/lib/api/users";
import { ErrorState } from "@/components/shared/ErrorState";
import { getUserPosts } from "@/lib/api/posts";
import { getUserArticles } from "@/lib/api/articles";
import { formatCount } from "@/lib/formatCount";
import { joinedDate } from "@/lib/formatTime";
import { articleUrl } from "@/lib/urls";
import {
  MapPin, Link as LinkIcon, Calendar, CheckCircle2,
  PenTool, Eye, Bookmark, MessageCircle, ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Profile, Post } from "@/lib/api/types";

const TABS = [
  { id: "posts", label: "Posts" },
  { id: "articles", label: "Articles" },
  { id: "collections", label: "Collections" },
  { id: "likes", label: "Likes" },
  { id: "media", label: "Media" },
  { id: "about", label: "About" },
];

interface ProfileViewProps {
  profile: Profile;
  // Server-fetched default-tab data, or null if that fetch failed - either
  // way SWR still owns revalidation/pagination from here, this is just the
  // seed so the first paint (and any crawler) sees real content.
  initialPosts: { posts: Post[]; nextCursor: string | null } | null;
}

export function ProfileView({ profile, initialPosts }: ProfileViewProps) {
  const router = useRouter();
  const { isAuthenticated, openAuthModal } = useAuthStore();
  const { isFollowing, toggleFollow } = useFollowState(profile.id, profile.isFollowing);
  const [activeTab, setActiveTab] = useState("posts");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  // Opening a DM is a server-side operation: it creates membership for both
  // parties and is idempotent on the pair, so tapping twice lands in the same
  // thread rather than creating a second. A block on either side is refused by
  // the API - this button is not what enforces it.
  const handleMessage = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setIsOpeningChat(true);
    try {
      const { id } = await openConversation(profile.id);
      router.push(`/messages/${id}`);
    } catch {
      window.alert("Couldn't open a conversation with this person.");
    } finally {
      setIsOpeningChat(false);
    }
  };

  const { data: postsData, error: postsError, mutate: mutatePosts } = useSWR(
    activeTab === "posts" ? `profile-posts-${profile.id}` : null,
    () => getUserPosts(profile.id),
    { fallbackData: initialPosts ?? undefined }
  );
  const { data: articlesData, error: articlesError, mutate: mutateArticles } = useSWR(activeTab === "articles" ? `profile-articles-${profile.id}` : null, () => getUserArticles(profile.id));

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadAvatar(file);
      router.refresh();
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
      router.refresh();
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-clip bg-white dark:bg-zinc-950">
      {/* Cover banner. Short on mobile - a 192px hero on a 700px screen spent
          a quarter of the viewport on decoration before any content. */}
      <div className="group relative h-28 w-full bg-zinc-100 sm:h-72 dark:bg-zinc-900">
        {profile.coverImage && <Image src={profile.coverImage} alt="" fill sizes="100vw" priority className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* This route renders no MobileHeader (lib/mobile/nav.ts gives it
            header: "none") so the cover reaches the top of the screen. Your
            own profile is a tab root and needs no back affordance, but
            someone else's was reached by pushing from a feed or a search
            result - so it gets one, floated over the cover. */}
        {!profile.isSelf && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-transform active:scale-90 sm:hidden"
            style={{ top: "calc(0.75rem + var(--safe-top))" }}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
          </button>
        )}

        {/* Your own profile is the mobile home for Saved, Drafts, Your
            activity, Settings and Log out - all of which live in the desktop
            TopNav's avatar dropdown, which is hidden below `md`. */}
        {profile.isSelf && <ProfileMenuSheet />}
        {profile.isSelf && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            <Button
              variant="secondary" size="sm" disabled={isUploading}
              onClick={() => coverInputRef.current?.click()}
              className="absolute right-4 top-4 hidden border-none bg-white/20 text-white backdrop-blur-md hover:bg-white/40 sm:right-6 sm:top-6 sm:flex"
            >
              Change Cover
            </Button>
          </>
        )}
      </div>

      <div className="relative z-10 mx-auto -mt-10 flex w-full max-w-7xl flex-col gap-8 px-4 pb-8 sm:-mt-16 sm:px-6 lg:flex-row lg:gap-12 lg:pb-12">
        <div className="min-w-0 flex-1">

          {/* Identity block. On mobile the avatar and name stack and the
              action buttons go full-width underneath - side-by-side at 360px
              left the name ~140px and truncated most real names. */}
          <div className="mb-4 flex items-end justify-between">
            <div className="group/avatar relative">
              <Avatar className="h-20 w-20 rounded-3xl border-4 border-white bg-white sm:h-32 sm:w-32 dark:border-zinc-950 dark:bg-zinc-900">
                <AvatarImage src={profile.image ?? undefined} alt="" className="rounded-3xl object-cover" />
                <AvatarFallback className="rounded-3xl text-2xl font-bold sm:text-3xl">{profile.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {profile.verified && (
                <div className="absolute -bottom-1.5 -right-1.5 rounded-full border-4 border-white bg-blue-500 p-1 text-white sm:-bottom-2 sm:-right-2 sm:p-1.5 dark:border-zinc-950" title="Verified Designer">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              )}
              {profile.isSelf && (
                <>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploading}
                    aria-label="Change profile photo"
                    className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/40 text-xs font-semibold text-white opacity-0 transition-opacity group-hover/avatar:opacity-100 focus-visible:opacity-100"
                  >
                    Change
                  </button>
                </>
              )}
            </div>

            {/* Desktop actions sit beside the avatar; mobile gets the
                full-width pair below. */}
            <div className="mb-2 hidden gap-3 sm:flex">
              {profile.isSelf ? (
                <Button variant="outline" nativeButton={false} className="rounded-full px-6 font-semibold dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800" render={<Link href="/settings/profile" />}>
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Message"
                    disabled={isOpeningChat}
                    onClick={handleMessage}
                    className="h-10 w-10 rounded-full dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    className="rounded-full px-8 font-semibold transition-transform active:scale-95 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    onClick={() => (isAuthenticated ? toggleFollow() : openAuthModal())}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mb-5 space-y-3 sm:mb-6 sm:space-y-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-3xl dark:text-white">{profile.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-zinc-500 dark:text-zinc-400">
                <span className="text-[14px] font-medium sm:text-[15px]">@{profile.username}</span>
                {profile.role && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="text-[14px] font-medium text-zinc-900 sm:text-[15px] dark:text-zinc-300">
                      {profile.role}{profile.company ? ` at ${profile.company}` : ""}
                    </span>
                  </>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="max-w-2xl text-[15px] leading-relaxed text-zinc-700 sm:text-[16px] dark:text-zinc-300">
                {profile.bio}
              </p>
            )}

            {profile.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.badges.map((badge) => (
                  <div key={badge} className="flex items-center gap-1.5 rounded-full border border-transparent bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    {badge}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-[13px] font-medium text-zinc-500 sm:gap-x-5 sm:gap-y-2 sm:pt-2 sm:text-sm dark:text-zinc-400">
              {profile.location && <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {profile.location}</div>}
              {profile.websiteUrl && (
                <div className="flex items-center gap-1.5">
                  <LinkIcon className="h-4 w-4" />
                  <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400">
                    {profile.websiteUrl.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Joined {joinedDate(profile.createdAt)}</div>
            </div>

            {/* Mobile primary actions: full-width, thumb-height, directly
                under the identity block where they're expected. */}
            <div className="flex gap-2 pt-1 sm:hidden">
              {profile.isSelf ? (
                <Button variant="outline" nativeButton={false} className="h-11 flex-1 rounded-full font-semibold dark:border-zinc-700 dark:text-zinc-100" render={<Link href="/settings/profile" />}>
                  Edit profile
                </Button>
              ) : (
                <>
                  <Button
                    className="h-11 flex-1 rounded-full font-semibold transition-transform active:scale-95 dark:bg-white dark:text-zinc-950"
                    onClick={() => (isAuthenticated ? toggleFollow() : openAuthModal())}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Message"
                    disabled={isOpeningChat}
                    onClick={handleMessage}
                    className="h-11 w-11 shrink-0 rounded-full dark:border-zinc-700 dark:text-zinc-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats. A single scannable row on mobile - the six-tile grid
              wrapped to two rows of chunky cards and pushed the tabs (the
              thing you actually came to use) off-screen. */}
          <div className="mb-5 flex items-center gap-5 border-y border-zinc-100 py-3 text-[14px] sm:hidden dark:border-zinc-800">
            {[
              { label: "posts", val: profile.postsCount },
              { label: "followers", val: profile.followersCount },
              { label: "following", val: profile.followingCount },
            ].map(stat => (
              <div key={stat.label} className="flex items-baseline gap-1.5">
                <span className="font-bold dark:text-white">{formatCount(stat.val)}</span>
                <span className="text-zinc-500 dark:text-zinc-400">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="mb-8 hidden gap-3 sm:grid sm:grid-cols-6">
            {[
              { label: "Posts", val: profile.postsCount },
              { label: "Articles", val: profile.articlesCount },
              { label: "Followers", val: profile.followersCount },
              { label: "Following", val: profile.followingCount },
              { label: "Total Likes", val: profile.totalLikesCount },
              { label: "Article Reads", val: profile.articleReadsCount },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col rounded-2xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                <span className="text-xl font-bold dark:text-white">{formatCount(stat.val)}</span>
                <span className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Tab rail pins under the mobile header so you can switch tabs
              without scrolling back up past the whole profile header. */}
          {/* Sticky on every breakpoint. It used to go `sm:static`, so on
              desktop the tabs scrolled away and you had to return to the top of
              a long profile to change them. --mobile-header-height resolves to
              0 on desktop (MobileHeader is hidden there), so the same offset
              pins it correctly under the mobile header and flush to the top on
              desktop. */}
          <div className="sticky top-[var(--mobile-header-height)] z-10 -mx-4 mb-5 border-b border-zinc-100 bg-white/90 px-4 backdrop-blur-xl sm:mb-6 dark:border-zinc-800 dark:bg-zinc-950/90">
            <div className="relative flex gap-5 overflow-x-auto no-scrollbar rail-x sm:gap-6">
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex items-center gap-2 whitespace-nowrap py-3.5 text-[15px] font-semibold transition-colors sm:py-4",
                      isActive ? "text-zinc-950 dark:text-white" : "text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-x-0 bottom-0 h-1 rounded-t-full bg-zinc-950 dark:bg-white"
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
              <div className="-mx-4 divide-y divide-zinc-100 bg-white sm:mx-0 sm:overflow-hidden sm:rounded-3xl sm:border sm:border-zinc-100 dark:divide-zinc-800/60 dark:bg-zinc-950 sm:dark:border-zinc-800/60">
                {postsError ? (
                  <ErrorState title="Couldn't load posts" error={postsError} onRetry={() => mutatePosts()} />
                ) : postsData?.posts.length ? (
                  postsData.posts.map((post) => <PostCard key={post.id} post={post} />)
                ) : (
                  <EmptyTab label="posts" name={profile.name} />
                )}
              </div>
            )}

            {activeTab === "articles" && (
              <div className="space-y-6">
                {articlesError ? (
                  <ErrorState title="Couldn't load articles" error={articlesError} onRetry={() => mutateArticles()} />
                ) : articlesData?.articles.length ? (
                  articlesData.articles.map((article) => (
                    <div key={article.id} className="group flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-3xl transition-all hover:shadow-sm bg-white dark:bg-zinc-950">
                      <Link href={articleUrl(article)} className="relative w-full sm:w-[240px] h-48 sm:h-[160px] shrink-0 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 block">
                        {article.coverImage && <Image src={article.coverImage} alt="" fill sizes="(max-width: 640px) 100vw, 240px" loading="lazy" className="object-cover group-hover:scale-105 transition-transform duration-500" />}
                      </Link>
                      <div className="flex flex-col flex-1 min-w-0 py-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                          {article.tags?.[0] && <span>{article.tags[0]}</span>}
                          {article.readTime && <><span>·</span><span>{article.readTime}</span></>}
                        </div>
                        <Link href={articleUrl(article)}>
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
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">When {name.split(' ')[0]} adds {label}, it will appear on this tab.</p>
    </div>
  );
}
