"use client";

import { useEffect, useState, useCallback } from "react";
import {
  urlBase64ToUint8Array,
  usePushNotification,
} from "@/lib/push-notification";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY = "rbank-pwa-banner-dismissed";
const INSTALL_DELAY_MS = 30_000;

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function hasBeenDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function setDismissed(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, "true");
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone() || !isMobileDevice() || hasBeenDismissed()) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  useEffect(() => {
    if (
      !deferredPrompt ||
      isStandalone() ||
      !isMobileDevice() ||
      hasBeenDismissed()
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setShowBanner(true);
    }, INSTALL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [deferredPrompt]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setShowBanner(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed();
    setShowBanner(false);
  }, []);

  return { showBanner, isInstalled, handleInstall, handleDismiss };
}

export function PWAInstallBanner() {
  const { showBanner, handleInstall, handleDismiss } = usePWAInstall();

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 p-4 md:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800">
          <span className="text-xl font-bold text-primary">RB</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">
            FamilyBank als App installieren
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Schneller Zugriff auf dein Banking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background-dark transition-colors hover:bg-primary/80"
          >
            Installieren
          </button>
          <button
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

interface PWARegistrationProps {
  userId?: string;
  vapidPublicKey?: string;
}

export function PWARegistration({
  userId,
  vapidPublicKey,
}: PWARegistrationProps) {
  const { requestPermission } = usePushNotification();
  const [isRegistered, setIsRegistered] = useState(false);

  const registerPush = useCallback(async () => {
    if (!userId || !vapidPublicKey || !("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setIsRegistered(true);
        return;
      }

      const result = await requestPermission({ userId, vapidPublicKey });
      if (result.success) {
        setIsRegistered(true);
      }
    } catch {
      // Silently fail — user may have denied permission
    }
  }, [userId, vapidPublicKey, requestPermission]);

  // Register service worker and push on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Service worker is auto-registered by next-pwa via <script> in _document
    // But we still register push when user is logged in
    if (userId && vapidPublicKey) {
      registerPush();
    }
  }, [userId, vapidPublicKey, registerPush]);

  return null;
}
