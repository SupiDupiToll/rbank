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
      <div className="mx-auto flex max-w-lg items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800">
          <span className="text-xl font-bold text-primary">RB</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">
            FamilyBank als App installieren
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {isIOS
              ? "Teilen \u2192 Zum Home-Bildschirm"
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

export function PWARegistration({
  userId,
  vapidPublicKey,
}: PWARegistrationProps) {
  const { requestPermission } = usePushNotification();
  const [hasAsked, setHasAsked] = useState(false);

  const registerPush = useCallback(async () => {
    if (!userId || !("serviceWorker" in navigator)) return;

    try {
      // Never ask again if already granted or denied
      if (Notification.permission !== "default") return;

      // iOS Safari does not support web push notifications unless the app
      // is installed to the home screen AND the user manually enables notifications.
      // We skip the permission prompt on iOS to avoid confusion.
      if (isSafariOnIOS()) {
        setHasAsked(true);
        return;
      }

      if (vapidPublicKey && "PushManager" in window) {
        // Full push registration with subscription
        const result = await requestPermission({ userId, vapidPublicKey });
        if (result.success) setHasAsked(true);
      } else {
        // Fallback: only ask for notification permission (no subscription)
        await Notification.requestPermission();
        setHasAsked(true);
      }
    } catch {
      // user denied or error — don't ask again
    }
  }, [userId, vapidPublicKey, requestPermission]);

  useEffect(() => {
    if (hasAsked || !userId) return;
    registerPush();
  }, [userId, hasAsked, registerPush]);

  return null;
}
