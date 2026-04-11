/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_URL = "/offline.html";
const CACHE_NAME = "rbank-offline-v1";

// All assets to pre-cache on install
const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  "/splash/se-portrait.png",
  "/splash/14-portrait.png",
  "/splash/14pro-portrait.png",
  "/splash/14promax-portrait.png",
  "/apple-touch-icon.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/manifest.json",
];

// Install: pre-cache offline page and splash screens
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          ASSETS_TO_CACHE.map((url) => new Request(url, { cache: "reload" })),
        ),
      ),
  );
  self.skipWaiting();
});

// Activate: clean up old caches, claim clients, enable navigation preload
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Delete old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );

      // Enable navigation preload for performance
      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.enable();
      }
    })(),
  );
  self.clients.claim();
});

// Fetch: intercept navigation requests, serve offline page on failure
self.addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        // Try navigation preload first (performance)
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
          return preloadResponse;
        }

        // Try network
        const networkResponse = await fetch(event.request);
        return networkResponse;
      } catch {
        // Network failed – return cached offline page
        console.log("Fetch failed; returning offline page.");
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(OFFLINE_URL);

        if (cachedResponse) {
          return cachedResponse;
        }

        // Fallback: return a minimal inline HTML response
        return new Response(
          `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0f1115"><title>Offline</title><style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1115;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#e2e8f0;padding:2rem}.c{text-align:center;max-width:24rem}.i{font-size:4rem;margin-bottom:1.5rem}h1{font-size:2rem;margin-bottom:.75rem;color:#f1f5f9;font-family:Georgia,serif}p{color:#94a3b8;font-size:1.125rem;line-height:1.6}button{margin-top:2rem;padding:.75rem 2rem;background:#b7e44b;color:#0f1115;border:none;border-radius:.75rem;font-size:1rem;font-weight:700;cursor:pointer}button:hover{opacity:.85}</style></head><body><div class="c"><div class="i">📡</div><h1>Offline</h1><p>Keine Internetverbindung.</p><button onclick="window.location.reload()">Erneut versuchen</button></div></body></html>`,
          {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        );
      }
    })(),
  );
});
