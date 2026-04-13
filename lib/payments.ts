import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { compare, hash } from "bcryptjs";
import { PaymentSessionStatus, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { appOrigin, env } from "@/lib/env";
import { formatEuroFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const CHECKOUT_COOKIE_PREFIX = "rbank_checkout_";
const CHECKOUT_SESSION_TTL_MS = 15 * 60_000;

export function generateMerchantCredentials() {
  const merchantSecret = randomBytes(32).toString("hex");
  return {
    merchantId: randomUUID(),
    merchantSecret,
    webhookSecret: merchantSecret,
  };
}

export async function hashMerchantSecret(secret: string) {
  return hash(secret, 12);
}

export async function hashWebhookSecret(secret: string) {
  return hash(secret, 12);
}

function getEncryptionKey() {
  return createHash("sha256").update(env.STACK_SECRET_SERVER_KEY).digest();
}

export function encryptWebhookSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(".");
}

export function decryptWebhookSecret(secretEnc: string) {
  const [ivHex, authTagHex, ciphertextHex] = secretEnc.split(".");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Invalid webhook secret ciphertext");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export async function verifyMerchantSecret(secret: string, secretHash: string) {
  return compare(secret, secretHash);
}

export function generatePaymentToken() {
  return `pay_${randomBytes(16).toString("hex")}`;
}

export function createPaymentExpiryDate() {
  return new Date(Date.now() + CHECKOUT_SESSION_TTL_MS);
}

const BLOCKED_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "file:",
  "blob:",
  "ftp:",
]);
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function safeParseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (BLOCKED_PROTOCOLS.has(url.protocol)) {
      return null;
    }
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function originsMatch(allowedUrl: URL, targetUrl: URL): boolean {
  if (allowedUrl.protocol !== targetUrl.protocol) {
    return false;
  }

  const allowedHost = allowedUrl.hostname.toLowerCase();
  const targetHost = targetUrl.hostname.toLowerCase();

  if (allowedHost.startsWith("*.")) {
    const parentDomain = allowedHost.slice(1);
    if (targetHost === parentDomain.slice(1)) {
      return allowedUrl.port === targetUrl.port;
    }
    if (!targetHost.endsWith(parentDomain)) {
      return false;
    }
    return allowedUrl.port === targetUrl.port;
  }

  if (allowedHost !== targetHost) {
    return false;
  }

  const allowedPort =
    allowedUrl.port || (allowedUrl.protocol === "https:" ? "443" : "80");
  const targetPort =
    targetUrl.port || (targetUrl.protocol === "https:" ? "443" : "80");
  return allowedPort === targetPort;
}

function matchesWildcardPath(allowedUrl: URL, targetUrl: URL): boolean {
  const allowedPath = allowedUrl.pathname.replace(/\/+$/, "");
  if (allowedPath.endsWith("/*")) {
    const allowedPrefix = allowedPath.slice(0, -1);
    const targetPath = targetUrl.pathname;
    return (
      targetPath === allowedPrefix || targetPath.startsWith(allowedPrefix + "/")
    );
  }
  return allowedPath === targetUrl.pathname.replace(/\/+$/, "");
}

export function isRedirectUrlAllowed(
  allowedUrls: string[],
  targetUrl: string,
): boolean {
  const parsedTarget = safeParseUrl(targetUrl);
  if (!parsedTarget) {
    return false;
  }

  return allowedUrls.some((allowedUrl) => {
    const parsedAllowed = safeParseUrl(allowedUrl);
    if (!parsedAllowed) {
      return false;
    }

    if (!originsMatch(parsedAllowed, parsedTarget)) {
      return false;
    }

    return matchesWildcardPath(parsedAllowed, parsedTarget);
  });
}

export function getPaymentStatus(session: {
  status: PaymentSessionStatus;
  expiresAt: Date;
}) {
  if (
    session.status === "PENDING" &&
    session.expiresAt.getTime() <= Date.now()
  ) {
    return "EXPIRED" as const;
  }

  return session.status;
}

export async function expireStalePaymentSession(token: string) {
  await prisma.paymentSession.updateMany({
    where: {
      token,
      status: "PENDING",
      expiresAt: { lte: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}

function signCheckoutCookieValue(token: string, userId: string) {
  return createHmac("sha256", env.STACK_SECRET_SERVER_KEY)
    .update(`${token}:${userId}`)
    .digest("hex");
}

export async function setCheckoutCookie(token: string, userId: string) {
  const jar = await cookies();
  const signature = signCheckoutCookieValue(token, userId);
  jar.set({
    name: `${CHECKOUT_COOKIE_PREFIX}${token}`,
    value: `${userId}.${signature}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/pay/${token}`,
    maxAge: CHECKOUT_SESSION_TTL_MS / 1000,
  });
}

export async function clearCheckoutCookie(token: string) {
  const jar = await cookies();
  jar.set({
    name: `${CHECKOUT_COOKIE_PREFIX}${token}`,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/pay/${token}`,
    expires: new Date(0),
  });
}

export async function getCheckoutCookieUserId(token: string) {
  const jar = await cookies();
  const rawValue = jar.get(`${CHECKOUT_COOKIE_PREFIX}${token}`)?.value;

  if (!rawValue) {
    return null;
  }

  const [userId, signature] = rawValue.split(".");
  if (!userId || !signature) {
    return null;
  }

  const expectedSignature = signCheckoutCookieValue(token, userId);
  const received = Buffer.from(signature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");

  if (received.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(received, expected)) {
    return null;
  }

  return userId;
}

export function buildMerchantAuthError() {
  return new Response(
    JSON.stringify({ error: "Ungueltige Merchant-Anmeldedaten." }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="rbank-pay"',
      },
    },
  );
}

export async function authenticateMerchantRequest(request: Request) {
  const authorizationHeader = request.headers.get("authorization");
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return { merchant: null, error: buildMerchantAuthError() };
  }

  const rawCredentials = authorizationHeader.slice("Bearer ".length).trim();
  const separatorIndex = rawCredentials.indexOf(":");

  if (separatorIndex <= 0) {
    return { merchant: null, error: buildMerchantAuthError() };
  }

  const merchantId = rawCredentials.slice(0, separatorIndex);
  const merchantSecret = rawCredentials.slice(separatorIndex + 1);

  const merchant = await prisma.merchant.findUnique({
    where: { merchantId },
  });

  if (!merchant || !merchant.isActive) {
    return { merchant: null, error: buildMerchantAuthError() };
  }

  const isValidSecret = await verifyMerchantSecret(
    merchantSecret,
    merchant.merchantSecretHash,
  );

  if (!isValidSecret) {
    return { merchant: null, error: buildMerchantAuthError() };
  }

  return { merchant, error: null };
}

export function formatPaymentLabel(amount: number, merchantName: string) {
  return `${formatEuroFromCents(amount)} an ${merchantName}`;
}

export function getCheckoutPaymentUrl(token: string) {
  return `${appOrigin}/pay/${token}`;
}

export type PaymentSessionWithRelations = Prisma.PaymentSessionGetPayload<{
  include: {
    merchant: true;
    user: {
      select: {
        id: true;
        customerId: true;
        displayName: true;
      };
    };
  };
}>;
