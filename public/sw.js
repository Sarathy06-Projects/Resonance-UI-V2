// Minimal service worker: no offline caching (auth/session data would go
// stale in a way that's worse than no cache at all). Its only job is to
// exist with a fetch handler - Chrome/Edge require a registered, fetch-
// handling service worker before `beforeinstallprompt` will fire.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
