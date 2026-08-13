"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Home, Compass, Bell, PenSquare, LogOut, User as UserIcon, Settings,
  MessageSquare, Palette, Eye, FileText, Lightbulb, Grid, FileEdit
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
import { motion } from "framer-motion";
import { profileUrl } from "@/lib/urls";

interface TopNavProps {
  className?: string;
}

export function TopNav({ className }: TopNavProps) {
  const { user, isAuthenticated, openAuthModal, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Explore", href: "/explore", icon: Compass },
    { name: "Notifications", href: "/notifications", icon: Bell, protected: true, hasUnread: true },
  ];

  const handleProtectedAction = (e: React.MouseEvent, isProtected?: boolean) => {
    if (isProtected && !isAuthenticated) {
      e.preventDefault();
      openAuthModal();
    }
  };

  return (
      <div
        className={cn(
          // Desktop-only chrome. Mobile has its own tab-rooted shell
          // (components/layout/mobile/), not a narrowed version of this bar -
          // so this hides outright below `md` rather than shedding items.
          "hidden md:flex px-4 md:px-6 items-center justify-center border-b sticky top-0 z-50 w-full transition-all duration-300",
          isScrolled
            ? "h-14 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-zinc-200/50 dark:border-zinc-800/50 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.1)] dark:shadow-none"
            : "h-16 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-zinc-100 dark:border-zinc-800 shadow-none",
          className
        )}
      >
        <div className="flex items-center justify-between max-w-5xl w-full gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <Logo size={32} className="transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold tracking-tight hidden lg:block dark:text-white">Resonance</span>
          </Link>
          
          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 shrink-0 relative">
            {navItems.filter(item => isAuthenticated || !item.protected).map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleProtectedAction(e, item.protected)}
                  className={cn(
                    "relative flex items-center gap-2 px-3 py-2 rounded-full transition-colors text-[15px] font-medium z-10",
                    isActive 
                      ? "text-zinc-950 dark:text-zinc-50" 
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <div className="relative">
                    <item.icon className={cn("w-5 h-5 transition-transform", isActive ? "stroke-[2.5]" : "stroke-2")} />
                    {item.hasUnread && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
                    )}
                  </div>
                  <span className="hidden xl:block">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Global Search (UI Only) */}
          <div className="hidden md:flex flex-1 max-w-sm justify-end xl:justify-center">
            <button className="group flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100/50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800 rounded-full w-full max-w-[240px] hover:border-zinc-300 dark:hover:border-zinc-700">
              <Search className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Auth / Profile Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />

            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button
                    size="sm"
                    aria-label="Create"
                    className="flex rounded-full h-9 w-9 md:w-auto px-0 md:px-4 font-semibold shadow-sm dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-transform"
                  >
                    <PenSquare className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Write</span>
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-48 dark:bg-zinc-900 dark:border-zinc-800">
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push('/create?type=discussion')}>
                    <MessageSquare className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Discussion</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push('/create?type=showcase')}>
                    <Palette className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Showcase</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push('/create?type=feedback')}>
                    <Eye className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Request Feedback</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push('/create?type=article')}>
                    <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Article</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push('/create?type=resource')}>
                    <Lightbulb className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Resource</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <Avatar className="w-9 h-9 border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:scale-105 transition-transform">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 dark:bg-zinc-900 dark:border-zinc-800">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.name && <p className="font-medium dark:text-zinc-100">{user.name}</p>}
                      {(user as any).email && <p className="w-[200px] truncate text-sm text-zinc-500 dark:text-zinc-400">{(user as any).email}</p>}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push(profileUrl(user))}>
                    <UserIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/collections")}>
                    <Grid className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Collections</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/drafts")}>
                    <FileEdit className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Drafts</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/settings")}>
                    <Settings className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" passHref>
                  <Button variant="ghost" size="sm" className="rounded-full font-medium h-9 px-3 md:px-4 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup" passHref>
                  <Button size="sm" className="rounded-full font-medium h-9 px-3 md:px-5 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-transform">
                    Join
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
