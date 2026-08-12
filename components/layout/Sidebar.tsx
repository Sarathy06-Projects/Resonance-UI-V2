"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Bell, User, Settings, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { Logo } from "@/components/shared/Logo";
import { profileUrl } from "@/lib/urls";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Explore", href: "/explore", icon: Compass },
    { name: "Notifications", href: "/notifications", icon: Bell, protected: true },
    // "#" when logged out is inert - clicking a protected item while
    // unauthenticated opens the auth modal instead of navigating (see
    // handleProtectedAction below), so this href is never actually used then.
    { name: "Profile", href: user ? profileUrl(user) : "#", icon: User, protected: true },
    { name: "Settings", href: "/settings", icon: Settings, protected: true },
  ];

  const handleProtectedAction = (e: React.MouseEvent, isProtected?: boolean) => {
    if (isProtected && !isAuthenticated) {
      e.preventDefault();
      openAuthModal();
    }
  };

  return (
    <div className={cn("flex flex-col p-6 h-full", className)}>
      <div className="flex items-center gap-3 mb-10 px-2">
        <Logo size={32} />
        <span className="text-xl font-bold tracking-tight dark:text-white">Resonance</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => handleProtectedAction(e, item.protected)}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 font-medium text-lg",
                isActive 
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]" 
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-950 dark:hover:text-zinc-100"
              )}
            >
              <item.icon className={cn("w-6 h-6 transition-transform", isActive ? "stroke-[2.5] scale-105" : "stroke-2 group-hover:scale-105")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Button 
          size="lg" 
          className="w-full rounded-full h-14 text-[17px] font-semibold shadow-sm hover:shadow-md transition-shadow"
          onClick={(e) => {
            if (!isAuthenticated) openAuthModal();
            else {/* Open create modal or navigate to /create */}
          }}
        >
          <PenSquare className="w-5 h-5 mr-2" />
          Create
        </Button>
      </div>
    </div>
  );
}
