import webpush from "web-push";
import { prisma } from "@/lib/prisma";

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@ruibank.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export type PushNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

async function sendToSubscription(
  subscriptionId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  const sub = await prisma.pushSubscription.findUnique({
    where: { id: subscriptionId }
  });

  if (!sub) return false;

  const pushSubscription: webpush.PushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth
    }
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    // Remove invalid/expired subscriptions
    if (
      error instanceof webpush.WebPushError &&
      (error.statusCode === 404 || error.statusCode === 410 || error.statusCode === 403)
    ) {
      await prisma.pushSubscription.delete({ where: { id: subscriptionId } }).catch(() => {});
    }
    console.error(`Failed to send push notification to ${subscriptionId}:`, error);
    return false;
  }
}

export async function sendToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<number> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true }
  });

  let successCount = 0;
  for (const sub of subscriptions) {
    const ok = await sendToSubscription(sub.id, payload);
    if (ok) successCount++;
  }
  return successCount;
}

export async function sendToAllUsers(payload: PushNotificationPayload): Promise<number> {
  const users = await prisma.user.findMany({
    select: { id: true }
  });

  let successCount = 0;
  for (const user of users) {
    const count = await sendToUser(user.id, payload);
    successCount += count;
  }
  return successCount;
}

// Notification builders
export function buildIncomingTransactionNotification(amountCents: number): PushNotificationPayload {
  const euros = (amountCents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return {
    title: "💰 Eingehende Transaktion",
    body: `+${euros} € eingegangen`,
    tag: `incoming-${Date.now()}`,
    data: { type: "incoming", amount: amountCents, url: "/dashboard/transactions" }
  };
}

export function buildOutgoingTransactionNotification(amountCents: number): PushNotificationPayload {
  const euros = (amountCents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return {
    title: "💸 Ausgehende Transaktion",
    body: `-${euros} € ausgegangen`,
    tag: `outgoing-${Date.now()}`,
    data: { type: "outgoing", amount: amountCents, url: "/dashboard/transactions" }
  };
}

export function buildTransferReceivedNotification(
  senderName: string,
  amountCents: number
): PushNotificationPayload {
  const euros = (amountCents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return {
    title: "↩️ Überweisung erhalten",
    body: `Überweisung von ${senderName} +${euros} €`,
    tag: `transfer-${Date.now()}`,
    data: { type: "transfer", amount: amountCents, sender: senderName, url: "/dashboard/transactions" }
  };
}

export function buildFestgeldExpiredNotification(): PushNotificationPayload {
  return {
    title: "🏦 Festgeld abgelaufen",
    body: "Dein Festgeldkonto ist abgelaufen",
    tag: `festgeld-expired-${Date.now()}`,
    data: { type: "festgeld-expired", url: "/dashboard/festgeld" }
  };
}
