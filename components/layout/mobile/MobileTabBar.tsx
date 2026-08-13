"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, SquarePen, Heart, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useUnreadNotifications } from "@/lib/hooks/useUnreadNotifications";
import { useScrollDirection } from "@/lib/hooks/useScrollDirection";
import { resolveMobileChrome, type MobileTab } from "@/lib/mobile/nav";
import { profileUrl } from "@/lib/urls";

interface MobileTabBarProps {
  onCompose: () => void;
}

// The root of the mobile IA. Five targets, icon-only - a label under every
// icon costs ~14px of vertical space on the one axis phones are shortest in,
// and these five destinations are conventional enough that the icon carries
// the meaning. Active state is weight + fill, not colour, so it still reads
// for colour-blind users and in both themes.
export function MobileTabBar({ onCompose }: MobileTabBarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const unreadCount = useUnreadNotifications();
  const barRef = useRef<HTMLElement>(null);

  const chrome = resolveMobileChrome(pathname);
  const direction = useScrollDirection({ enabled: chrome.isRoot });
  const isHidden = direction === "down";

  // Pushed screens hand the bottom edge to the screen itself - a thread view
  // pins "Reply to @user" there, the editor pins Publish. Stacking those on
  // top of a tab bar would spend a third of a phone's height on chrome and
  // put two competing primary actions side by side.
  const showTabBar = chrome.isRoot;

  // Publish the real rendered height (content + the device's actual bottom
  // safe-area inset, both included in offsetHeight) so anything else pinned
  // to the bottom on mobile sits exactly above this bar instead of guessing
  // an offset that silently drifts whenever this component's own padding or
  // icon size changes.
  useEffect(() => {
    const root = document.documentElement;
    // On a pushed screen there is no tab bar to sit above, so publish 0 -
    // otherwise the last measured height lingers and every screen that pads
    // for the bar leaves a band of dead space above its own bottom bar.
    if (!showTabBar) {
      root.style.setProperty("--mobile-tabbar-height", "0px");
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const publish = () => root.style.setProperty("--mobile-tabbar-height", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, [showTabBar]);

  const go = (tab: Exclude<MobileTab, null>, href: string, requiresAuth: boolean) => ({
    href: requiresAuth && !isAuthenticated ? "#" : href,
    onClick: (e: React.MouseEvent) => {
      if (requiresAuth && !isAuthenticated) {
        e.preventDefault();
        openAuthModal();
      }
    },
    isActive: chrome.tab === tab,
  });

  const home = go("home", "/", false);
  const search = go("search", "/explore", false);
  const activity = go("activity", "/notifications", true);
  const profile = go("profile", user ? profileUrl(user) : "#", true);

  if (!showTabBar) return null;

  return (
    <nav
      ref={barRef}
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/85",
        "pb-safe transition-transform duration-300 ease-out",
        isHidden && "translate-y-full"
      )}
    >
      <div className="flex items-stretch justify-around px-1">
        <TabButton {...home} label="Home" icon={Home} fillWhenActive />
        <TabButton {...search} label="Search" icon={Search} />

        {/* Activity and Profile are hidden entirely when signed out rather
            than shown as auth prompts. Both describe things that only exist
            for a signed-in user - *your* notifications, *your* profile - so
            to a public visitor they are two of five tabs that lead nowhere
            but a modal. The desktop TopNav filters them the same way; the
            header's Join button carries the sign-up path instead. */}

        {/* Compose is an action, not a destination - it opens a sheet over
            whatever you were reading rather than navigating away from it, so
            you never lose your place in the feed to write a reply.

            Signed out it can't do that job, so it's hidden rather than shown
            as a third auth prompt. That leaves the public bar as Home and
            Search - two tabs that both actually work - with signing up
            handled by the header's Join button. */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={onCompose}
            aria-label="New post"
            className="group flex flex-1 items-center justify-center py-2.5 active:scale-95 transition-transform"
          >
            <span className="flex h-10 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 transition-colors group-active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:group-active:bg-zinc-700">
              <SquarePen className="h-6 w-6" strokeWidth={2} />
            </span>
          </button>
        )}

        {isAuthenticated && (
          <>
            <TabButton {...activity} label="Activity" icon={Heart} badgeCount={unreadCount} fillWhenActive />
            <TabButton
              {...profile}
              label="Profile"
              icon={User}
              avatarSrc={user?.avatar}
              avatarFallback={user?.name?.charAt(0)}
            />
          </>
        )}
      </div>
    </nav>
  );
}

interface TabButtonProps {
  href: string;
  onClick: (e: React.MouseEvent) => void;
  isActive: boolean;
  label: string;
  icon: typeof Home;
  badgeCount?: number;
  avatarSrc?: string;
  avatarFallback?: string;
  /** Solid-fill the glyph when active. Right for closed shapes (house,
   *  heart); wrong for the magnifier, which just becomes a blob - that one
   *  carries its active state on stroke weight alone. */
  fillWhenActive?: boolean;
}

function TabButton({ href, onClick, isActive, label, icon: Icon, badgeCount, avatarSrc, avatarFallback, fillWhenActive }: TabButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      // min-h-12 keeps every target at/above the 44-48px the platform
      // guidelines ask for even though the icon itself is only 26px.
      className={cn(
        "relative flex min-h-12 flex-1 items-center justify-center py-2.5 transition-transform active:scale-90",
        isActive ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-500"
      )}
    >
      {avatarSrc !== undefined || avatarFallback ? (
        <Avatar
          className={cn(
            "h-7 w-7 transition-all",
            isActive ? "ring-2 ring-zinc-950 dark:ring-zinc-50" : "ring-1 ring-zinc-200 dark:ring-zinc-700"
          )}
        >
          <AvatarImage src={avatarSrc} alt="" />
          <AvatarFallback className="bg-zinc-100 text-xs dark:bg-zinc-800">{avatarFallback ?? "?"}</AvatarFallback>
        </Avatar>
      ) : (
        <Icon
          className="h-[26px] w-[26px]"
          strokeWidth={isActive ? 2.4 : 1.9}
          fill={isActive && fillWhenActive ? "currentColor" : "none"}
        />
      )}

      {!!badgeCount && (
        <span
          className="absolute right-[22%] top-1.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-white dark:ring-zinc-950"
          aria-label={`${badgeCount} unread`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}
