// The mobile information architecture, in one place.
//
// Desktop is a single persistent chrome (one top nav) wrapped around every
// route - every screen looks the same and the URL is what changes. Mobile is
// not that: it's a tab-rooted navigation stack, so each route has to declare
// which of the five tabs it belongs to, whether it is a *root* of that tab
// (tab bar visible, no back affordance) or a *pushed* screen inside it (back
// chevron, tab bar yields to whatever the screen pins to the bottom), and
// which header treatment it gets.
//
// Keeping that as data rather than as conditionals scattered through the
// components means a new route is one entry here, and the tab bar / header /
// scroll behaviour all agree about it automatically.

export type MobileHeaderMode =
  // Brand header: logo only, scrolls away with the feed.
  | "home"
  // The search field *is* the header - no separate title row.
  | "search"
  // Large title that collapses into a compact one on scroll.
  | "large-title"
  // Compact centered title with a back chevron. The pushed-screen default.
  | "title"
  // Screen paints its own header (profile does, over its cover image).
  | "none";

export type MobileTab = "home" | "search" | "activity" | "messages" | "profile" | null;

export interface MobileChrome {
  header: MobileHeaderMode;
  /** Rendered in the header for "title" / "large-title" modes. */
  title?: string;
  /** Which tab bar item lights up while this route is open. */
  tab: MobileTab;
  /** Root screens keep the tab bar; pushed screens give the bottom edge back
   *  to the screen (reply composer, publish bar) and show a back chevron. */
  isRoot: boolean;
  /**
   * Whether the header pins to the top of the viewport while the screen
   * scrolls.
   *
   * False means it scrolls away with the content, which is what the home
   * feed wants: the brand bar is worth a glance on arrival but not 56px of
   * permanent real estate, and the screen's own sticky sub-header (the
   * For you / Following switcher) takes over the top edge once it's gone.
   *
   * The alternative - keeping the header pinned but translating it out of
   * view on scroll-down - is what shipped first and was wrong: the sticky
   * sub-header stayed pinned at the header's *measured* height, so when the
   * header animated away the feed showed through the empty strip it left
   * behind. Two independently-positioned sticky layers cannot be kept in
   * sync through a CSS variable that only updates on resize.
   */
  stickyHeader: boolean;
}

const PUSHED_DEFAULTS = { isRoot: false, stickyHeader: true } as const;

// Ordered: first match wins, so put the specific patterns above the
// catch-alls. Each entry is [test, chrome].
const ROUTES: Array<[RegExp, MobileChrome]> = [
  // --- Tab roots -----------------------------------------------------------
  [/^\/$/, { header: "home", tab: "home", isRoot: true, stickyHeader: false }],
  [/^\/explore$/, { header: "search", tab: "search", isRoot: true, stickyHeader: true }],
  [/^\/notifications$/, { header: "large-title", title: "Activity", tab: "activity", isRoot: true, stickyHeader: true }],

  // --- Pushed inside the Home tab -----------------------------------------
  [/^\/post\/[^/]+$/, { header: "title", title: "Thread", tab: "home", ...PUSHED_DEFAULTS }],
  [/^\/article\/[^/]+$/, { header: "title", title: "Article", tab: "home", ...PUSHED_DEFAULTS }],
  [/^\/series\/[^/]+$/, { header: "title", title: "Series", tab: "home", ...PUSHED_DEFAULTS }],
  // /topics/:tag also has /articles and /discussions sub-tabs.
  [/^\/topics\/[^/]+(\/(articles|discussions))?$/, { header: "title", title: "Topic", tab: "search", ...PUSHED_DEFAULTS }],

  // --- Messages -------------------------------------------------------------
  // A thread is a pushed screen so the tab bar yields the bottom edge to the
  // composer, exactly as a post thread does.
  // The screen paints its own header, because a generic "Message" title above
  // a second bar naming the other person would be two headers stacked on a
  // phone - roughly 110px spent saying less than one of them does alone. The
  // thread's own header carries the back chevron, avatar, name and presence.
  [/^\/messages\/[^/]+$/, { header: "none", title: "Message", tab: "messages", ...PUSHED_DEFAULTS }],
  [/^\/messages$/, { header: "large-title", title: "Messages", tab: "messages", ...PUSHED_DEFAULTS }],

  // --- Pushed inside the Profile tab --------------------------------------
  [/^\/settings\/profile$/, { header: "title", title: "Edit profile", tab: "profile", ...PUSHED_DEFAULTS }],
  [/^\/settings$/, { header: "large-title", title: "Settings", tab: "profile", ...PUSHED_DEFAULTS }],
  [/^\/collections$/, { header: "large-title", title: "Saved", tab: "profile", ...PUSHED_DEFAULTS }],
  [/^\/drafts$/, { header: "large-title", title: "Drafts", tab: "profile", ...PUSHED_DEFAULTS }],
  [/^\/activity$/, { header: "large-title", title: "Your activity", tab: "profile", ...PUSHED_DEFAULTS }],

  // --- Composer ------------------------------------------------------------
  // Long-form only: short posts never reach this route, they're written in
  // the compose sheet the tab bar's centre button opens.
  [/^\/create$/, { header: "title", title: "New post", tab: null, ...PUSHED_DEFAULTS }],

  // --- /@username and /@username/... --------------------------------------
  // Profile paints its own header over the cover image; anything nested
  // under a profile (a post or article permalink) is a pushed screen.
  //
  // Both spellings are matched on purpose. /@username is the public URL and
  // is what usePathname() reports, because proxy.ts *rewrites* rather than
  // redirects it (the browser URL never changes) - but the internal
  // /u/:username routes it rewrites to are directly reachable too, and the
  // server sees those during SSR. Matching only one spelling would leave the
  // other falling through to FALLBACK, i.e. a profile rendering with a
  // "pushed screen" title bar and no tab bar.
  [/^\/(@[^/]+|u\/[^/]+)\/series\/[^/]+$/, { header: "title", title: "Series", tab: "home", ...PUSHED_DEFAULTS }],
  [/^\/(@[^/]+|u\/[^/]+)\/[^/]+$/, { header: "title", title: "Thread", tab: "home", ...PUSHED_DEFAULTS }],
  [/^\/(@[^/]+|u\/[^/]+)$/, { header: "none", tab: "profile", isRoot: true, stickyHeader: true }],
];

const FALLBACK: MobileChrome = { header: "title", tab: null, ...PUSHED_DEFAULTS };

export function resolveMobileChrome(pathname: string): MobileChrome {
  for (const [pattern, chrome] of ROUTES) {
    if (pattern.test(pathname)) return chrome;
  }
  return FALLBACK;
}

// Routes that opt out of the mobile shell entirely (they ship their own
// full-bleed chrome). Auth and onboarding live outside (main)/ so they never
// reach the shell, but /create is inside it and wants the full screen.
export function hidesMobileChrome(pathname: string): boolean {
  return pathname === "/create";
}
