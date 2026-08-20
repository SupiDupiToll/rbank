import { createHmac } from "node:crypto";
import { requireCardSecret } from "@/lib/wallet/config";

export function deriveCardLastFour(userId: string) {
  const hmac = createHmac("sha256", requireCardSecret())
    .update(`family-card:${userId}`)
    .digest("hex");
  const numeric = parseInt(hmac.slice(0, 8), 16);
  return String(numeric % 10000).padStart(4, "0");
}

export function maskedCardNumber(userId: string) {
  return `•••• ${deriveCardLastFour(userId)}`;
}
