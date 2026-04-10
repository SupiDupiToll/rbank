/// <reference lib="webworker" />
// Custom service worker entry — workbox will inject runtime caching here

declare const self: ServiceWorkerGlobalScope;

// Push notification handler
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "RBANK", body: event.data.text() };
  }

  const title = payload.title ?? "RBANK";
  const options: NotificationOptions = {
    body: payload.body ?? "Neue Benachrichtigung",
    icon: payload.icon ?? "/icon-192x192.png",
    badge: payload.badge ?? "/icon-96x96.png",
    tag: payload.tag ?? "default",
    data: payload.data ?? {},
    actions: [{ action: "open", title: "Öffnen" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen =
    (event.notification.data as Record<string, string>)?.url ?? "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(urlToOpen);
      }),
  );
});

// Install event - skip waiting
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate event - claim clients
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});
