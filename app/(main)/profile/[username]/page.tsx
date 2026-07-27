"use client";

import { use, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/shared/PostCard";
import { mockUsers, mockPosts, mockArticles, exploreTopics } from "@/lib/mock-data";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  MapPin, Link as LinkIcon, Calendar, CheckCircle2, Award, 
  TrendingUp, PenTool, Figma, ArrowRight, ExternalLink,
  BookOpen, Heart, Eye, Bookmark, Share2, MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

// --- Mock Rich Profile Data ---
const profileData = {
  coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
  role: "Principal Product Designer",
  company: "Acme Corp",
  badges: [
    { label: "Verified Designer", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Top Writer", icon: PenTool, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Design Mentor", icon: Award, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" }
  ],
  stats: {
    posts: "142",
    articles: "28",
    followers: "14.2K",
    following: "1,245",
    totalLikes: "48.5K",
    articleReads: "124K"
  },
  highlights: [
    { type: "Most Read Article", title: "Why we should stop using pure black", icon: BookOpen, color: "text-rose-500" },
    { type: "Trending This Week", title: "Spatial UI Guidelines", icon: TrendingUp, color: "text-emerald-500" },
    { type: "Featured by Resonance", title: "Design System Architecture", icon: Award, color: "text-amber-500" }
  ],
  toolbox: ["Figma", "Framer", "Spline", "ProtoPie", "Linear", "Notion"],
  interests: ["Accessibility", "Design Systems", "Typography", "Motion Design", "Spatial UI"],
  projects: [
    {
      id: "p1",
      title: "Acme Design System",
      description: "A comprehensive design system built for scale.",
      thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=500",
      link: "#"
    },
    {
      id: "p2",
      title: "Fintech Dashboard UI",
      description: "A modern, accessible financial dashboard concept.",
      thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=500",
      link: "#"
    }
  ]
};

const TABS = [
  { id: "posts", label: "Posts", count: profileData.stats.posts },
  { id: "articles", label: "Articles", count: profileData.stats.articles },
  { id: "collections", label: "Collections", count: "12" },
  { id: "likes", label: "Likes", count: profileData.stats.totalLikes },
  { id: "media", label: "Media", count: "84" },
  { id: "about", label: "About", count: null }
];

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const [activeTab, setActiveTab] = useState("posts");
  
  const profileUser = mockUsers.find(u => u.username === resolvedParams.username) || mockUsers[0];
  const isOwnProfile = user?.username === profileUser.username;

  const handleInteraction = () => {
    if (!isAuthenticated) openAuthModal();
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0 w-full overflow-x-hidden">
      
      {/* --- Cover Banner --- */}
      <div className="h-48 sm:h-72 w-full relative group">
        <img src={profileData.coverImage} alt="Cover" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {isOwnProfile && (
          <Button variant="secondary" size="sm" className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white border-none transition-all">
            Change Cover
          </Button>
        )}
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row gap-8 lg:gap-12 relative -mt-12 sm:-mt-16 z-10 pb-12">
        
        {/* =========================================================================
            LEFT COLUMN (MAIN PROFILE)
        ========================================================================== */}
        <div className="flex-1 min-w-0">
          
          {/* Header & Meta */}
          <div className="flex justify-between items-end mb-4">
            <div className="relative">
              <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white dark:border-zinc-950 shadow-lg bg-white dark:bg-zinc-900 rounded-3xl">
                <AvatarImage src={profileUser.avatar} className="rounded-3xl object-cover" />
                <AvatarFallback className="rounded-3xl text-3xl font-bold">{profileUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-1.5 rounded-full border-4 border-white dark:border-zinc-950 shadow-sm" title="Verified Designer">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            
            <div className="flex gap-3 mb-2">
              {isOwnProfile ? (
                <Button variant="outline" className="rounded-full font-semibold px-6 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 shadow-sm">
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="icon" className="rounded-full w-10 h-10 shadow-sm dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button className="rounded-full font-semibold px-8 shadow-sm transition-transform active:scale-95 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200" onClick={handleInteraction}>
                    Follow
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight dark:text-white flex items-center gap-2">
                {profileUser.name}
              </h1>
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mt-1">
                <span className="text-[15px] font-medium">@{profileUser.username}</span>
                <span>·</span>
                <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-300">{profileData.role} at {profileData.company}</span>
              </div>
            </div>

            <p className="text-[16px] leading-relaxed max-w-2xl text-zinc-700 dark:text-zinc-300">
              {profileUser.bio}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {profileData.badges.map(badge => (
                <div key={badge.label} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-transparent", badge.bg, badge.color)}>
                  <badge.icon className="w-3.5 h-3.5" />
                  {badge.label}
                </div>
              ))}
            </div>

            {/* Location & Links */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium pt-2">
              <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> San Francisco, CA</div>
              <div className="flex items-center gap-1.5"><LinkIcon className="w-4 h-4" /> <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">acme.design</a></div>
              <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Joined Oct 2023</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
            {[
              { label: "Posts", val: profileData.stats.posts },
              { label: "Articles", val: profileData.stats.articles },
              { label: "Followers", val: profileData.stats.followers },
              { label: "Following", val: profileData.stats.following },
              { label: "Total Likes", val: profileData.stats.totalLikes },
              { label: "Article Reads", val: profileData.stats.articleReads }
            ].map(stat => (
              <div key={stat.label} className="flex flex-col p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-xl font-bold dark:text-white">{stat.val}</span>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>



          {/* Tabs Navigation */}
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
                    {tab.count && (
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold", isActive ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "bg-zinc-50 dark:bg-zinc-900/50 text-zinc-400")}>
                        {tab.count}
                      </span>
                    )}
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

          {/* Tab Content Areas */}
          <div className="min-h-[400px]">
            {activeTab === "posts" && (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 -mx-4 sm:mx-0 sm:border sm:border-zinc-100 sm:dark:border-zinc-800/60 sm:rounded-3xl sm:overflow-hidden bg-white dark:bg-zinc-950">
                {mockPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {activeTab === "articles" && (
              <div className="space-y-6">
                {mockArticles.slice(0, 3).map((article) => (
                  <div key={article.id} className="group flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-3xl transition-all hover:shadow-sm bg-white dark:bg-zinc-950 cursor-pointer">
                    <div className="w-full sm:w-[240px] h-48 sm:h-[160px] shrink-0 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                      <img src={article.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                        <span>{article.category}</span>
                        <span>·</span>
                        <span>{article.readTime}</span>
                      </div>
                      <h2 className="text-xl font-bold dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {article.title}
                      </h2>
                      <p className="text-zinc-500 dark:text-zinc-400 text-[15px] line-clamp-2 mb-4">
                        {article.excerpt}
                      </p>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex gap-4 text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1.5 text-sm font-medium"><Eye className="w-4 h-4" /> 12.4K</span>
                          <span className="flex items-center gap-1.5 text-sm font-medium"><Bookmark className="w-4 h-4" /> 842</span>
                        </div>
                        <Button variant="ghost" className="h-8 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3">
                          Read Article <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-12">
                {/* Designer Toolbox */}
                <section>
                  <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-zinc-400" /> Designer Toolbox
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {profileData.toolbox.map(tool => (
                      <span key={tool} className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl text-[15px] font-semibold dark:text-zinc-200">
                        {tool}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Interests */}
                <section>
                  <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-zinc-400" /> Interests
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {profileData.interests.map(interest => (
                      <span key={interest} className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-xl text-[15px] font-semibold">
                        {interest}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Featured Projects */}
                <section>
                  <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-zinc-400" /> Pinned Projects
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profileData.projects.map(project => (
                      <div key={project.id} className="group relative rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                        <div className="h-40 bg-zinc-100 dark:bg-zinc-900 w-full overflow-hidden">
                          <img src={project.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="p-5">
                          <h4 className="font-bold text-lg dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.title}</h4>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{project.description}</p>
                          <Button variant="outline" size="sm" className="w-full rounded-xl font-semibold dark:border-zinc-700 dark:text-zinc-200">
                            View Project <ExternalLink className="w-3.5 h-3.5 ml-1.5 text-zinc-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Empty states for incomplete tabs */}
            {["collections", "likes", "media"].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                  <Eye className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-lg font-bold dark:text-white mb-2">Nothing to show yet</h3>
                <p className="text-zinc-500 max-w-sm">When {profileUser.name.split(' ')[0]} adds content here, it will appear on this tab.</p>
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
