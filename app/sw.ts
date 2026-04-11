/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_PAGE = "/offline.html";
const CACHE_NAME = "rbank-offline-v1";

// Pre-cache the offline page on install
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_PAGE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

// Intercept all fetch requests – serve offline page on network failure
self.addEventListener("fetch", (event: FetchEvent) => {
  // Only handle GET requests for documents (HTML pages)
  if (event.request.method !== "GET") return;
  if (event.request.mode !== "navigate" && !event.request.headers.get("accept")?.includes("text/html")) return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      // Network failed – serve cached offline page
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(OFFLINE_PAGE);
      return cachedResponse ?? Response.error();
    }),
  );
});
