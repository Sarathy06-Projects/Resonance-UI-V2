"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { profileUrl } from "@/lib/urls";

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const navRef = useRef<HTMLDivElement>(null);

  // Publishes the real rendered height (content + the actual per-device
  // safe-area inset, since offsetHeight includes padding) as --bottom-nav-
  // height, so anything else fixed to the bottom on mobile - e.g.
  // CommentThread's composer trigger bar - can sit exactly above this nav
  // instead of guessing a pixel offset that drifts out of sync whenever
  // this component's own padding/icon size changes.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const publish = () => document.documentElement.style.setProperty("--bottom-nav-height", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Explore", href: "/explore", icon: Compass },
    { name: "Notifications", href: "/notifications", icon: Bell, protected: true },
    // "#" when logged out is inert - see Sidebar.tsx's identical comment.
    { name: "Profile", href: user ? profileUrl(user) : "#", icon: User, protected: true },
  ];

  const handleProtectedAction = (e: React.MouseEvent, isProtected?: boolean) => {
    if (isProtected && !isAuthenticated) {
      e.preventDefault();
      openAuthModal();
    }
  };

  return (
    <div ref={navRef} className={cn("flex items-center justify-around px-2 py-3 pb-safe", className)}>
      {navItems.filter(item => isAuthenticated || !item.protected).map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={(e) => handleProtectedAction(e, item.protected)}
            className={cn(
              "p-3 rounded-full transition-colors flex flex-col items-center gap-1",
              isActive ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50"
            )}
          >
            <item.icon className={cn("w-6 h-6", isActive ? "stroke-[2.5]" : "stroke-2")} />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
