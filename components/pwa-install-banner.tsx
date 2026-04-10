"use client";

import { useEffect, useState, useCallback } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-notification";
import { registerServiceWorker } from "@/lib/register-sw";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "rbank-pwa-banner-dismissed";
const INSTALL_DELAY_MS = 5_000;

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return true;
  }
}

function setDismissedFlag(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // ignore
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canShow, setCanShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (isStandalone() || !isMobileDevice() || isDismissed()) return;

    setIsIOS(isIOSDevice());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setDismissedFlag();
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (isStandalone() || !isMobileDevice() || isDismissed()) return;

    const timer = setTimeout(() => setCanShow(true), INSTALL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    }
    setDismissedFlag();
    setCanShow(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissedFlag();
    setCanShow(false);
  }, []);

  return {
    showBanner: canShow,
    hasNativePrompt: !!deferredPrompt,
    isIOS,
    handleInstall,
    handleDismiss,
  };
}

export function PWAInstallBanner() {
  const { showBanner, hasNativePrompt, isIOS, handleInstall, handleDismiss } =
    usePWAInstall();

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 p-4 md:hidden">
      <div className="mx-auto flex max-w-lg flex-col gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800">
            <span className="text-xl font-bold text-primary">RB</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-100">
              FamilyBank als App installieren
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {isIOS
                ? "Tippe auf Teilen \u2192 \u201eZum Home-Bildschirm\u201c"
                : hasNativePrompt
                  ? "Tippe auf Installieren"
                  : "Browser-Men\u00fc \u2192 App installieren"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasNativePrompt ? (
              <button
                onClick={handleInstall}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background-dark transition-colors hover:bg-primary/80"
              >
                Installieren
              </button>
            ) : null}
            <button
              onClick={handleDismiss}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>
        </div>
        {isIOS && (
          <div className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
            <strong>Hinweis:</strong> Push-Benachrichtigungen funktionieren nur,
            wenn die App zum Home-Bildschirm hinzugefügt und von dort gestartet
            wird.
          </div>
        )}
      </div>
    </div>
  );
}

interface PWARegistrationProps {
  userId?: string;
  vapidPublicKey?: string;
}

function isSafariOnIOS(): boolean {
  if (typeof window === "undefined") return false;
  const isIOS = isIOSDevice();
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  return isIOS && isSafari;
}

/**
 * Check if Web Push is supported on this device.
 * Push is NOT supported on iOS Safari in the EU region (since iOS 17.4).
 * Push only works on iOS when the PWA is installed to home screen.
 */
function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("PushManager" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  return true;
}

export function PWARegistration({
  userId,
  vapidPublicKey,
}: PWARegistrationProps) {
  const [hasAsked, setHasAsked] = useState(false);

  const registerPush = useCallback(async () => {
    if (!userId || !vapidPublicKey) return;

    try {
      // iOS Safari: Push notifications only work when the PWA is installed
      // to the Home Screen AND launched from there (standalone mode).
      // In the regular Safari browser, Notification.requestPermission() does nothing.
      // In standalone mode on iOS 16.4+, the permission prompt works fine.
      if (isIOSDevice() && !isStandalone()) {
        console.log(
          "\uD83D\uDCF1 iOS: Push notifications only work when launched from Home Screen. Skipping permission prompt.",
        );
        setHasAsked(true);
        return;
      }

      // Check if push is supported
      if (!isPushSupported()) {
        console.log(
          "\u26A0\uFE0F Push notifications not supported on this device",
        );
        setHasAsked(true);
        return;
      }

      // Never ask again if already granted or denied
      if (Notification.permission !== "default") {
        // Permission already set, but we still need to save subscription
        if (Notification.permission === "granted") {
          await subscribeAndSave(userId, vapidPublicKey);
        }
        setHasAsked(true);
        return;
      }

      // Ensure service worker is registered first
      await registerServiceWorker();

      // Wait for service worker to be ready
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.ready;
      }

      // Request notification permission — this shows the consent banner
      const permissionResult = await Notification.requestPermission();

      if (permissionResult !== "granted") {
        console.log(`\u274C Notification permission: ${permissionResult}`);
        setHasAsked(true);
        return;
      }

      // Create push subscription and save to server
      await subscribeAndSave(userId, vapidPublicKey);
      setHasAsked(true);
    } catch (error) {
      console.error("Push registration error:", error);
      setHasAsked(true);
    }
  }, [userId, vapidPublicKey]);

  useEffect(() => {
    if (hasAsked || !userId || !vapidPublicKey) return;
    registerPush();
  }, [userId, vapidPublicKey, hasAsked, registerPush]);

  return null;
}

async function subscribeAndSave(
  userId: string,
  vapidPublicKey: string,
): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker not available");
  }

  const registration = await navigator.serviceWorker.ready;

  // Create push subscription
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });

  // Save subscription to server
  const response = await fetch("/api/customer/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription, userId }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to save subscription: ${error}`);
  }

  const result = await response.json();
  if (result.alreadyExists) {
    console.log("\u2139\uFE0F Push subscription already exists");
  } else {
    console.log("\u2705 Push subscription saved successfully");
  }
}
