/**
 * Minimal Service Worker for push notifications.
 * This file is used in development mode.
 * In production, next-pwa will generate a full service worker.
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "RBANK", body: event.data.text() };
  }

  const title = payload.title ?? "RBANK";
  const options = {
    body: payload.body ?? "Neue Benachrichtigung",
    icon: payload.icon ?? "/icon-192x192.png",
    badge: payload.badge ?? "/icon-96x96.png",
    tag: payload.tag ?? "default",
    data: payload.data ?? {},
    actions: [{ action: "open", title: "Öffnen" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url ?? "/dashboard";

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

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
