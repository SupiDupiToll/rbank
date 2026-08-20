import { createHmac, timingSafeEqual } from "node:crypto";
import {
  requireLinkSecret,
  walletConfig,
  type WalletLinkTarget,
  walletLinkTargetPath,
} from "@/lib/wallet/config";

const TOKEN_VERSION = 1;
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

type WalletLinkPayload = {
  v: number;
  uid: string;
  t: WalletLinkTarget;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function signWalletLink(
  userId: string,
  target: WalletLinkTarget,
  ttlSeconds = DEFAULT_TTL_SECONDS,
) {
  const payload = base64UrlEncode(
    JSON.stringify({
      v: TOKEN_VERSION,
      uid: userId,
      t: target,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    } satisfies WalletLinkPayload),
  );
  const signature = createHmac("sha256", requireLinkSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function createWalletLinkUrl(userId: string, target: WalletLinkTarget) {
  return `${walletConfig.appUrl}/wallet/entry/${signWalletLink(userId, target)}`;
}

export function verifyWalletLinkToken(token: string) {
  const separatorIndex = token.indexOf(".");
  if (separatorIndex === -1) {
    return null;
  }

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", requireLinkSecret())
    .update(payload)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(base64UrlDecode(payload)) as WalletLinkPayload;

    if (
      data.v !== TOKEN_VERSION ||
      typeof data.uid !== "string" ||
      data.uid.length === 0
    ) {
      return null;
    }

    if (data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const path = walletLinkTargetPath(data.t);
    if (!path) {
      return null;
    }

    return { userId: data.uid, target: data.t, path };
  } catch {
    return null;
  }
}
