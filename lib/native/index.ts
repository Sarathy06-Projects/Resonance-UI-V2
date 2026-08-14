"use client";

// The native bridge.
//
// Resonance runs in two places now: a browser, and a Capacitor WebView on
// Android (the shell lives in ../resonanceandroidapp). This module is the only
// thing in the web app that knows the difference. Everything here answers
// "false" / "unsupported" / no-ops in a browser, so a call site can ask for a
// native capability unconditionally and fall back to what it already did.
//
// It deliberately imports nothing. Capacitor injects a `window.Capacitor`
// object with a `Plugins` registry before the app's own JS runs, so the whole
// bridge is a set of typed accessors over that global. Adding @capacitor/core
// as a dependency would work too, but it would ship a runtime to every browser
// visitor for a code path none of them can ever take, and put a native SDK in
// the critical path of the Vercel build. This costs the web bundle nothing.

// --- The shape of what Capacitor injects ------------------------------------

interface CapacitorGlobal {
  isNativePlatform: () => boolean;
  getPlatform: () => string;
  Plugins: Record<string, Record<string, (...args: never[]) => Promise<unknown>> | undefined>;
}

type Listener = { remove: () => void };

function cap(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  const c = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return c && typeof c.isNativePlatform === "function" ? c : null;
}

/**
 * True only inside the Android app.
 *
 * Not safe to call during render on the server, and not stable across
 * hydration - the server always sees false. Anything that changes what is
 * *rendered* has to read this in an effect and re-render, or the markup will
 * mismatch. Anything that only runs in an event handler can call it directly.
 */
export function isNative(): boolean {
  const c = cap();
  return c ? c.isNativePlatform() : false;
}

export function nativePlatform(): "android" | "ios" | "web" {
  const c = cap();
  if (!c) return "web";
  const p = c.getPlatform();
  return p === "android" || p === "ios" ? p : "web";
}

/** A plugin's method map, or null when not running natively / not installed. */
function plugin(name: string) {
  const c = cap();
  if (!c || !c.isNativePlatform()) return null;
  return c.Plugins?.[name] ?? null;
}

/**
 * Calls a plugin method, swallowing the "not available here" case.
 *
 * Every native capability in this file is an enhancement over something the
 * web already does, so a missing plugin has to degrade rather than throw - a
 * rejected promise from, say, hiding the splash screen should never be able to
 * take down the app it was about to reveal.
 */
async function invoke<T>(pluginName: string, method: string, options?: unknown): Promise<T | null> {
  const p = plugin(pluginName);
  const fn = p?.[method];
  if (typeof fn !== "function") return null;
  try {
    return (await (fn as (o?: unknown) => Promise<T>)(options)) ?? null;
  } catch (err) {
    // Name only. Plugin errors can carry the arguments that caused them, and
    // those arguments include story images and, for the push token call, a
    // credential.
    console.warn(`[native] ${pluginName}.${method} failed:`, err instanceof Error ? err.message : "unknown");
    return null;
  }
}

function listen(pluginName: string, event: string, handler: (data: never) => void): Listener | null {
  const p = plugin(pluginName);
  const add = p?.["addListener"];
  if (typeof add !== "function") return null;
  try {
    // addListener returns a promise resolving to the handle in Capacitor 7,
    // but the object it resolves to is also returned synchronously enough for
    // removal to be chained off the promise.
    const handle = (add as unknown as (e: string, cb: (d: never) => void) => Promise<Listener>)(event, handler);
    return { remove: () => void handle.then((h) => h.remove()).catch(() => {}) };
  } catch {
    return null;
  }
}

// --- Splash -----------------------------------------------------------------

/** Dismisses the native splash. No-op in a browser. */
export function hideSplash(): void {
  void invoke("SplashScreen", "hide", { fadeOutDuration: 200 });
}

// --- Status bar / safe areas ------------------------------------------------

/**
 * Tells the shell which way the status bar icons should read.
 *
 * @param theme the app's *resolved* theme. A dark app needs light icons.
 */
export function syncStatusBar(theme: "light" | "dark"): void {
  // Named from the background's point of view, matching the native plugin.
  void invoke("SystemUi", "setStyle", { style: theme });
}

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Subscribes to inset changes (rotation, keyboard, nav-mode switch). */
export function onSafeAreaChange(handler: (insets: SafeArea) => void): () => void {
  const l = listen("SystemUi", "safeAreaChanged", handler as (d: never) => void);
  return () => l?.remove();
}

/** The current window insets, in CSS px. Null in a browser. */
export function getSafeArea(): Promise<SafeArea | null> {
  return invoke<SafeArea>("SystemUi", "getSafeArea");
}

/**
 * Writes insets onto <html> as the custom properties globals.css reads.
 *
 * The native plugin also writes these, but it cannot be the only writer: it
 * publishes on the first inset dispatch, which happens while the WebView is
 * still on about:blank, and loading the real page throws that document (and
 * its inline styles) away. Anything that replaces the document - the initial
 * load, a hard reload, the offline page recovering - has to re-apply them,
 * which is what makes the web layer the right owner.
 */
export function applySafeArea(insets: SafeArea): void {
  const s = document.documentElement.style;
  s.setProperty("--android-inset-top", `${insets.top}px`);
  s.setProperty("--android-inset-right", `${insets.right}px`);
  s.setProperty("--android-inset-bottom", `${insets.bottom}px`);
  s.setProperty("--android-inset-left", `${insets.left}px`);
}

// --- Hardware back button ---------------------------------------------------

export interface BackButtonEvent {
  canGoBack: boolean;
}

/**
 * Subscribes to the Android back button.
 *
 * Capacitor's default handler exits the app whenever the WebView reports no
 * history, which is wrong for a client-side-routed app: Next's App Router
 * pushes entries the WebView does not always count. Registering any listener
 * disables that default, so the handler passed here owns the decision
 * entirely - including calling exitApp when leaving really is the right thing.
 */
export function onBackButton(handler: (event: BackButtonEvent) => void): () => void {
  const l = listen("App", "backButton", handler as (d: never) => void);
  return () => l?.remove();
}

export function exitApp(): void {
  void invoke("App", "exitApp");
}

// --- Lifecycle --------------------------------------------------------------

/** Fires when the app is foregrounded or backgrounded. */
export function onAppStateChange(handler: (state: { isActive: boolean }) => void): () => void {
  const l = listen("App", "appStateChange", handler as (d: never) => void);
  return () => l?.remove();
}

/**
 * Fires when a deep link opens the app while it is already running.
 *
 * Not sufficient on its own: on a *cold* start the intent is delivered as the
 * activity is created, which is before React has mounted and subscribed, so
 * the event is gone by the time this listener exists. Pair it with
 * getLaunchUrl() - that is what the pairing is for.
 */
export function onDeepLink(handler: (event: { url: string }) => void): () => void {
  const l = listen("App", "appUrlOpen", handler as (d: never) => void);
  return () => l?.remove();
}

/**
 * The URL the app was launched with, or null for an ordinary launcher tap.
 *
 * Covers the cold-start case onDeepLink structurally cannot: Capacitor holds
 * the launch intent's URL so it can still be read after the fact.
 */
export async function getLaunchUrl(): Promise<string | null> {
  const result = await invoke<{ url?: string }>("App", "getLaunchUrl");
  return result?.url ?? null;
}

// --- Network ----------------------------------------------------------------

export function onNetworkChange(handler: (status: { connected: boolean }) => void): () => void {
  const l = listen("Network", "networkStatusChange", handler as (d: never) => void);
  return () => l?.remove();
}

export function getNetworkStatus(): Promise<{ connected: boolean } | null> {
  return invoke("Network", "getStatus");
}

// --- Haptics ----------------------------------------------------------------

/** A light tap. Used where the mobile UI already has an active:scale press. */
export function tapFeedback(): void {
  void invoke("Haptics", "impact", { style: "LIGHT" });
}

// --- Browser ----------------------------------------------------------------

/**
 * Opens a URL outside the app's WebView, in a Chrome Custom Tab.
 *
 * Custom Tabs, not a plain WebView, and not a new Capacitor window: they share
 * the user's real browser session (so an existing Google login is reused
 * instead of being re-entered), they show the origin in a way the user can
 * verify, and Google's OAuth policy refuses to serve its consent screen to an
 * embedded WebView at all.
 */
export async function openExternal(url: string): Promise<boolean> {
  const result = await invoke("Browser", "open", { url, presentationStyle: "popover" });
  return result !== null;
}

// --- Instagram story sharing ------------------------------------------------

export interface StoryShareResult {
  shared: boolean;
  /** Whether the story itself carries a tappable link. Always false today -
   *  see the note in InstagramSharePlugin.java. */
  linkAttached?: boolean;
  reason?: "instagram-not-installed" | "instagram-cannot-handle" | "permission-denied" | "no-target";
}

/** Whether the "Instagram story" target is worth showing at all. */
export async function canShareToInstagram(): Promise<boolean> {
  const result = await invoke<{ available: boolean }>("InstagramShare", "isInstagramAvailable");
  return result?.available === true;
}

/**
 * Opens Instagram's story composer with the given card already loaded.
 *
 * @param imageBase64 the 1080x1920 PNG, base64. Same card /api/share-image
 *                    produces for the web flow.
 * @param contentUrl  the destination, passed as Instagram's content_url extra.
 */
export function shareToInstagramStory(imageBase64: string, contentUrl: string): Promise<StoryShareResult | null> {
  return invoke<StoryShareResult>("InstagramShare", "shareToStory", { imageBase64, contentUrl });
}

/** Hands the card to the Android share sheet instead. */
export function shareStoryToSystemSheet(imageBase64: string, text: string): Promise<StoryShareResult | null> {
  return invoke<StoryShareResult>("InstagramShare", "shareToSystemSheet", { imageBase64, text });
}

/** Reads a Blob as bare base64 (no data: prefix), for the two calls above. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("could not read the story image"));
    reader.onloadend = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma > -1 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

// --- Camera / gallery -------------------------------------------------------

export type PhotoSource = "camera" | "photos";

/**
 * Picks or captures an image and returns it as a File, so callers can hand it
 * straight to the existing apiUpload() path without a second code branch.
 *
 * Returns null when the user cancels, and when not running natively - a
 * browser caller keeps using its <input type="file">, which is already the
 * right control there.
 *
 * `quality: 85` and a 2048px cap: the backend re-encodes uploads with sharp
 * anyway, and a modern phone camera produces 4000px JPEGs that cost several
 * seconds on mobile data before the server ever sees them.
 */
export async function pickImage(source: PhotoSource): Promise<File | null> {
  const result = await invoke<{ base64String?: string; format?: string }>("Camera", "getPhoto", {
    quality: 85,
    width: 2048,
    allowEditing: false,
    // base64 rather than a file URI: a content:// or capacitor:// URI cannot
    // be fetch()ed from the WebView on all Android versions, and the upload
    // path needs a real File anyway.
    resultType: "base64",
    source: source === "camera" ? "CAMERA" : "PHOTOS",
    // Only ask for the camera permission when the camera is actually the
    // chosen source. Passing CAMERA here for a gallery pick would prompt for
    // a permission the action does not need.
    saveToGallery: false,
    correctOrientation: true,
  });

  if (!result?.base64String) return null;

  const format = result.format || "jpeg";
  const mime = `image/${format === "jpg" ? "jpeg" : format}`;
  const binary = atob(result.base64String);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return new File([bytes], `upload.${format}`, { type: mime });
}

// --- Push notifications -----------------------------------------------------

export interface PushRegistration {
  token: string;
}

/**
 * Requests notification permission and registers with FCM.
 *
 * Returns the granted state. Android 13+ shows a system prompt here, so this
 * must be called from somewhere the user has context for it - not on first
 * launch.
 */
export async function requestPushPermission(): Promise<"granted" | "denied" | "unavailable"> {
  const current = await invoke<{ receive: string }>("PushNotifications", "checkPermissions");
  if (current === null) return "unavailable";
  if (current.receive === "granted") return "granted";

  const asked = await invoke<{ receive: string }>("PushNotifications", "requestPermissions");
  return asked?.receive === "granted" ? "granted" : "denied";
}

/** Starts FCM registration. The token arrives via onPushToken. */
export function registerForPush(): void {
  void invoke("PushNotifications", "register");
}

export function onPushToken(handler: (registration: PushRegistration) => void): () => void {
  const l = listen("PushNotifications", "registration", handler as (d: never) => void);
  return () => l?.remove();
}

/** Fires when a notification is tapped, with whatever data the server sent. */
export function onPushAction(
  handler: (event: { notification: { data?: Record<string, string> } }) => void
): () => void {
  const l = listen("PushNotifications", "pushNotificationActionPerformed", handler as (d: never) => void);
  return () => l?.remove();
}

/** Clears the notification shade, e.g. once the user has read the activity tab. */
export function clearDeliveredNotifications(): void {
  void invoke("PushNotifications", "removeAllDeliveredNotifications");
}
