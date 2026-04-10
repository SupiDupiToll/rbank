"use client";

import { useState, useCallback } from "react";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

interface RegisterPushParams {
  userId: string;
  vapidPublicKey: string;
}

interface PushRegistrationResult {
  success: boolean;
  permission: NotificationPermission;
}

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  const requestPermission = useCallback(
    async ({
      userId,
      vapidPublicKey,
    }: RegisterPushParams): Promise<PushRegistrationResult> => {
      if (!("Notification" in window)) {
        return { success: false, permission: "denied" };
      }

      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        return { success: false, permission: result };
      }

      try {
        // Ensure service worker is ready
        const registration = await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            vapidPublicKey,
          ) as BufferSource,
        });

        const body = {
          subscription,
          userId,
        };

        const response = await fetch("/api/customer/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          console.error("Failed to save push subscription");
          return { success: false, permission: result };
        }

        return { success: true, permission: result };
      } catch (error) {
        console.error("Push registration failed:", error);
        return { success: false, permission: result };
      }
    },
    [],
  );

  return { permission, requestPermission };
}
