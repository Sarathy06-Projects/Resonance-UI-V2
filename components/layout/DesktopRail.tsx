"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, SquarePen, Heart, MessageCircle, User, Menu, Bookmark, FileEdit, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useUnreadNotifications } from "@/lib/hooks/useUnreadNotifications";
import { useChatUnread } from "@/lib/hooks/useChatUnread";
import { resolveMobileChrome, type MobileTab } from "@/lib/mobile/nav";
import { profileUrl } from "@/lib/urls";

/**
 * The desktop navigation rail.
 *
 * Desktop and mobile now share one information architecture: the same five
 * destinations, resolved from the same route table (lib/mobile/nav.ts), just
 * rendered as a fixed left rail instead of a bottom tab bar. Previously the two
 * disagreed - the top nav offered Home/Explore/Notifications plus a search box,
 * a write dropdown and an avatar menu, while mobile had five tabs - so the same
 * app taught you two different maps depending on the width of your window.
 *
 * Icon-only and narrow on purpose. A vertical rail costs ~72px of a wide
 * viewport where a top bar costs a full row of vertical space, which is the
 * axis a reading column actually needs.
 */
interface DesktopRailProps {
  onCompose: () => void;
}

export function DesktopRail({ onCompose }: DesktopRailProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal, logout } = useAuthStore();
  const unreadNotifications = useUnreadNotifications();
  const unreadMessages = useChatUnread();

  const activeTab = resolveMobileChrome(pathname).tab;

  const go = (tab: Exclude<MobileTab, null>, href: string, requiresAuth: boolean) => ({
    isActive: activeTab === tab,
    href: requiresAuth && !isAuthenticated ? "#" : href,
    onClick: (e: React.MouseEvent) => {
      if (requiresAuth && !isAuthenticated) {
        e.preventDefault();
        openAuthModal();
      }
    },
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center border-r border-zinc-100 bg-white py-4 md:flex dark:border-zinc-800 dark:bg-zinc-950">
      <Link href="/" aria-label="Resonance home" className="mb-6 transition-transform hover:scale-105">
        <Logo size={30} />
      </Link>

      {/* Centred so the rail reads as navigation rather than a stack of
          controls, and so the same items sit in the same place at any height. */}
      <nav className="flex flex-1 flex-col items-center justify-center gap-1">
        <RailLink {...go("home", "/", false)} label="Home" icon={Home} fillWhenActive />
        <RailLink {...go("search", "/explore", false)} label="Search" icon={Search} />
        {/* Search keeps stroke-weight only - a filled magnifier is a blob. */}

        {/* Compose is an action, not a destination - it opens over whatever you
            were reading rather than navigating away from it. */}
        <button
          type="button"
          onClick={() => (isAuthenticated ? onCompose() : openAuthModal())}
          aria-label="New post"
          title="New post"
          className="my-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
        >
          <SquarePen className="h-[22px] w-[22px]" />
        </button>

        {isAuthenticated && (
          <>
            <RailLink
              {...go("activity", "/notifications", true)}
              label="Activity"
              icon={Heart}
              badge={unreadNotifications}
              fillWhenActive
            />
            {/* Messages sits in the rail rather than behind the overflow menu.
                It is a place you go, with unread state worth surfacing - the
                menu is for settings-shaped destinations you visit rarely, and
                burying an inbox there hides the one thing that changes. */}
            <RailLink
              {...go("messages", "/messages", true)}
              label="Messages"
              icon={MessageCircle}
              badge={unreadMessages}
              fillWhenActive
            />
            <RailLink
              {...go("profile", user ? profileUrl(user) : "#", true)}
              label="Profile"
              icon={User}
              avatarSrc={user?.avatar}
              avatarFallback={user?.name?.charAt(0)}
            />
          </>
        )}
      </nav>

      <div className="flex flex-col items-center gap-1">
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="More"
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Menu className="h-[22px] w-[22px]" />
            </DropdownMenuTrigger>
            {/* The secondary destinations live here rather than in the rail
                itself - they are visited occasionally, and five primary items
                stay legible where nine would not. */}
            <DropdownMenuContent side="right" align="end" className="w-52 rounded-xl dark:border-zinc-800 dark:bg-zinc-900">
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/collections")}>
                <Bookmark className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <span>Saved</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/drafts")}>
                <FileEdit className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <span>Drafts</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/settings")}>
                <Settings className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50"
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
          <Button
            size="sm"
            nativeButton={false}
            className="h-9 w-11 rounded-2xl px-0 text-[13px] font-semibold"
            render={<Link href="/signup" aria-label="Join Resonance" />}
          >
            Join
          </Button>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}

interface RailLinkProps {
  href: string;
  onClick: (e: React.MouseEvent) => void;
  isActive: boolean;
  label: string;
  icon: typeof Home;
  badge?: number;
  avatarSrc?: string;
  avatarFallback?: string;
  /** Solid-fill the glyph when active - right for closed shapes, wrong for the
   *  magnifier, which just becomes a blob. Mirrors MobileTabBar. */
  fillWhenActive?: boolean;
}

function RailLink({ href, onClick, isActive, label, icon: Icon, badge, avatarSrc, avatarFallback, fillWhenActive }: RailLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-current={isActive ? "page" : undefined}
      // Active state is weight and fill, never a filled box. The compose button
      // is the one element in the rail with a background, so a box has exactly
      // one meaning here: "this does something", not "you are here". They read
      // as the same control otherwise, which is what the previous version did.
      // Carrying the state on fill rather than colour also keeps it legible for
      // colour-blind users and in both themes.
      className={cn(
        "relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors",
        isActive
          ? "text-zinc-950 dark:text-zinc-50"
          : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
      )}
    >
      {avatarSrc !== undefined || avatarFallback ? (
        <Avatar className={cn("h-6 w-6", isActive && "ring-2 ring-zinc-950 dark:ring-zinc-50")}>
          <AvatarImage src={avatarSrc} alt="" />
          <AvatarFallback className="bg-zinc-100 text-[10px] dark:bg-zinc-800">{avatarFallback ?? "?"}</AvatarFallback>
        </Avatar>
      ) : (
        <Icon
          className="h-[22px] w-[22px]"
          strokeWidth={isActive ? 2.4 : 1.9}
          fill={isActive && fillWhenActive ? "currentColor" : "none"}
        />
      )}

      {!!badge && (
        <span className="absolute right-1.5 top-1.5 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white ring-2 ring-white dark:ring-zinc-950">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
