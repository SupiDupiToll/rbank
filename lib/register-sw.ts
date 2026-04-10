/**
 * Manually register the service worker for push notifications.
 * This works in both development and production modes.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (error) {
    // In development, the SW might not exist yet — that's okay
    console.warn("Service Worker registration failed or unavailable:", error);
    return null;
  }
}

/**
 * Check if the service worker is active and ready.
 */
export function isServiceWorkerReady(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && !!navigator.serviceWorker.controller;
}
