"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Clock, TrendingUp, Hash, ArrowRight, UserPlus, Users, Sparkles } from "lucide-react";
import { PostCard } from "@/components/shared/PostCard";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { mockUsers, trendingHashtags, exploreTopics, suggestedCommunities } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/store/useDataStore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Sub-components for cleaner structure
const SectionHeader = ({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) => (
  <div className="flex items-end justify-between mb-6 px-4 sm:px-6">
    <div>
      <h2 className="text-xl font-bold tracking-tight dark:text-white">{title}</h2>
      {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

const DesignerCard = ({ user, isFollowed, onFollow }: any) => (
  <div className="w-[280px] shrink-0 p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl flex flex-col hover:shadow-sm transition-all duration-300 group">
    <div className="flex items-center gap-3 mb-4">
      <img src={user.avatar} alt="" className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-700" />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-[15px] dark:text-white truncate">{user.name}</div>
        <div className="text-[13px] text-zinc-500 truncate">@{user.username}</div>
      </div>
    </div>
    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">{user.role || "Designer"}</div>
    <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2 mb-4 flex-1">
      {user.bio || "Creative mind building beautiful digital experiences."}
    </p>
    <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">12.4K Followers</div>
      <Button 
        variant={isFollowed ? "secondary" : "outline"}
        size="sm"
        className={cn("rounded-full font-semibold transition-all h-8 px-4", isFollowed ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200" : "dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800")}
        onClick={() => onFollow(user.id)}
      >
        {isFollowed ? "Following" : "Follow"}
      </Button>
    </div>
  </div>
);

const CommunityCard = ({ community }: any) => (
  <div className="relative overflow-hidden w-full p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 border-dashed rounded-3xl flex flex-col group">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative z-10 flex flex-col h-full">
      <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-zinc-100 dark:border-zinc-700 mb-4">
        {community.icon}
      </div>
      <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{community.name}</h3>
      <p className="text-sm text-zinc-500 mb-6">{community.members} Members</p>
      
      <div className="mt-auto">
        <Button disabled variant="outline" className="w-full rounded-full border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500">
          Coming Soon
        </Button>
      </div>
    </div>
  </div>
);

export default function ExplorePage() {
  const { posts, articles, followedUsers, toggleFollow } = useDataStore();
  const { isAuthenticated, openAuthModal } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(false); // Simulate loading

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Handle outside click for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFollow = (userId: string) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    toggleFollow(userId);
  };

  const filters = ["All", "Posts", "Articles", "Designers", "Topics", "Hashtags", "Newest", "Trending", "Following"];

  // Filter data
  const filteredPosts = posts.filter(post => post.content.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredArticles = articles.filter(article => article.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredDesigners = mockUsers.filter(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTopics = exploreTopics.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

  const hasResults = filteredPosts.length > 0 || filteredArticles.length > 0 || filteredDesigners.length > 0;

  return (
    <div className="flex flex-col min-h-screen w-full bg-white dark:bg-zinc-950 pb-20 overflow-x-hidden">
      
      {/* 1. Search Hero & 2. Filters */}
      <div className="sticky top-0 sm:top-16 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800">
        
        {/* Search Bar */}
        <div className="p-4 sm:px-6 pt-6" ref={searchContainerRef}>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search designers, articles, posts or hashtags" 
              className="w-full pl-12 pr-4 py-3.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-50 dark:focus:bg-zinc-950 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-500 focus:ring-0 rounded-2xl text-[15px] font-medium dark:text-zinc-100 transition-all outline-none shadow-sm placeholder:text-zinc-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
            />

            {/* Dropdown UI */}
            {isSearchFocused && !searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Recent Searches</div>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left text-sm dark:text-zinc-200">
                    <Clock className="w-4 h-4 text-zinc-400" /> Dark Mode Patterns
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left text-sm dark:text-zinc-200">
                    <Clock className="w-4 h-4 text-zinc-400" /> Figma Variables
                  </button>
                  
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                  
                  <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Trending</div>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left text-sm font-medium dark:text-zinc-200">
                    <TrendingUp className="w-4 h-4 text-blue-500" /> Spatial UI Guidelines
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left text-sm font-medium dark:text-zinc-200">
                    <TrendingUp className="w-4 h-4 text-blue-500" /> Accessibility contrast
                  </button>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                  
                  <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Suggested Topics</div>
                  <div className="flex flex-wrap gap-2 px-3 py-2">
                    {exploreTopics.slice(0, 4).map(topic => (
                      <span key={topic} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-medium dark:text-zinc-300 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-6 pb-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 max-w-5xl mx-auto min-w-max">
            {filters.map(filter => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition-all",
                  activeFilter === filter 
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm" 
                    : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto py-8 space-y-12 sm:space-y-16">
        
        {/* Loading State */}
        {isLoading && (
          <div className="px-4 sm:px-6 space-y-8 animate-pulse">
            <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-48 mb-6" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3].map(i => <div key={i} className="w-[280px] h-[200px] bg-zinc-100 dark:bg-zinc-800 rounded-3xl shrink-0" />)}
            </div>
          </div>
        )}

        {!isLoading && searchQuery && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2 dark:text-white">No results found</h2>
            <p className="text-zinc-500 max-w-sm">We couldn't find anything matching "{searchQuery}". Try different keywords or browse topics.</p>
          </div>
        )}

        {!isLoading && hasResults && (
          <>
            {/* 3. Trending Today */}
            {(activeFilter === "All" || activeFilter === "Hashtags") && (
              <section>
                <SectionHeader 
                  title="Trending Today" 
                  subtitle="The most discussed topics right now."
                  action={
                    <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  }
                />
                <div className="flex gap-4 overflow-x-auto px-4 sm:px-6 pb-4 no-scrollbar snap-x snap-mandatory">
                  {trendingHashtags.map((tag, i) => (
                    <Link href={`/hashtag/${tag.tag.replace('#', '')}`} key={i} className="snap-start shrink-0 min-w-[200px] p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                          <Hash className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg dark:text-white">{tag.tag}</span>
                      </div>
                      <div className="text-sm text-zinc-500 font-medium ml-11">{tag.posts}</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Featured Designers */}
            {(activeFilter === "All" || activeFilter === "Designers") && filteredDesigners.length > 0 && (
              <section>
                <SectionHeader title="Featured Designers" subtitle="Creative minds making waves this week." />
                <div className="flex gap-4 overflow-x-auto px-4 sm:px-6 pb-4 no-scrollbar snap-x snap-mandatory">
                  {filteredDesigners.map(user => (
                    <div key={user.id} className="snap-start">
                      <DesignerCard 
                        user={user} 
                        isFollowed={followedUsers.includes(user.id)} 
                        onFollow={handleFollow} 
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Featured Articles */}
            {(activeFilter === "All" || activeFilter === "Articles") && filteredArticles.length > 0 && (
              <section>
                <SectionHeader title="Top Articles" subtitle="In-depth thoughts from industry leaders." />
                <div className="flex gap-6 overflow-x-auto px-4 sm:px-6 pb-6 no-scrollbar snap-x snap-mandatory">
                  {filteredArticles.map(article => (
                    <div key={article.id} className="snap-start h-full">
                      <ArticleCard article={article} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Browse Topics */}
            {(activeFilter === "All" || activeFilter === "Topics") && filteredTopics.length > 0 && (
              <section className="px-4 sm:px-6">
                <SectionHeader title="Browse Topics" />
                <div className="flex flex-wrap gap-3">
                  {filteredTopics.map((topic) => (
                    <button key={topic} className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 dark:text-zinc-200 rounded-2xl font-semibold hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all text-sm">
                      {topic}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 6. Popular Discussions */}
            {(activeFilter === "All" || activeFilter === "Posts") && filteredPosts.length > 0 && (
              <section className="px-4 sm:px-6">
                <SectionHeader title="Popular Discussions" subtitle="Join the conversation." />
                <div className="max-w-2xl mx-auto space-y-4">
                  {filteredPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </section>
            )}

            {/* 8. Suggested Communities */}
            {activeFilter === "All" && !searchQuery && (
              <section className="px-4 sm:px-6">
                <SectionHeader 
                  title="Suggested Communities" 
                  subtitle="Find your niche." 
                  action={<Sparkles className="w-6 h-6 text-amber-500" />}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {suggestedCommunities.map(community => (
                    <CommunityCard key={community.id} community={community} />
                  ))}
                </div>
              </section>
            )}

            {/* 9. Load More Feed */}
            {activeFilter === "All" && (
              <div className="py-12 flex justify-center border-t border-zinc-100 dark:border-zinc-800 mx-4 sm:mx-6">
                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-current" />
                  <div className="w-2 h-2 rounded-full bg-current" />
                  <div className="w-2 h-2 rounded-full bg-current" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
