import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { pinSchema } from "@/lib/security";

const scrypt = promisify(scryptCallback);
const KEY_BYTES = 64;
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_WINDOW_MS = 10 * 60_000;

export async function hashPin(pin: string) {
  const normalizedPin = pinSchema.parse(pin);
  return hash(normalizedPin, 12);
}

async function verifyLegacyScryptPin(pin: string, pinHash: string) {
  const [salt, storedHash] = pinHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(pin, salt, KEY_BYTES)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedKey);
}

export async function verifyPin(pin: string, pinHash: string | null | undefined) {
  if (!pinHash) {
    return false;
  }

  const normalizedPin = pinSchema.parse(pin);

  if (pinHash.startsWith("$2")) {
    return compare(normalizedPin, pinHash);
  }

  return verifyLegacyScryptPin(normalizedPin, pinHash);
}

export function getPinAttemptsRemaining(attemptCount: number) {
  return Math.max(0, MAX_PIN_ATTEMPTS - attemptCount);
}

export async function getRecentPinAttemptCount(userId: string, ip: string) {
  const windowStart = new Date(Date.now() - PIN_LOCK_WINDOW_MS);

  return prisma.pinAttempt.count({
    where: {
      userId,
      ip,
      createdAt: { gte: windowStart },
    },
  });
}

export async function recordFailedPinAttempt(userId: string, ip: string) {
  const createdAt = new Date();
  const windowStart = new Date(createdAt.getTime() - PIN_LOCK_WINDOW_MS);

  const result = await prisma.$transaction(async (tx) => {
    await tx.pinAttempt.create({
      data: { userId, ip, createdAt },
    });

    const recentAttempts = await tx.pinAttempt.count({
      where: {
        userId,
        ip,
        createdAt: { gte: windowStart },
      },
    });

    let lockedUntil: Date | null = null;

    if (recentAttempts >= MAX_PIN_ATTEMPTS) {
      lockedUntil = new Date(createdAt.getTime() + PIN_LOCK_WINDOW_MS);
      await tx.user.update({
        where: { id: userId },
        data: { pinLockedUntil: lockedUntil },
      });
    }

    return { recentAttempts, lockedUntil };
  });

  if (result.lockedUntil) {
    console.warn("Checkout PIN locked", { userId, ip, lockedUntil: result.lockedUntil.toISOString() });
  }

  return result;
}

export async function clearPinAttempts(userId: string, ip: string) {
  await prisma.$transaction([
    prisma.pinAttempt.deleteMany({ where: { userId, ip } }),
    prisma.user.update({
      where: { id: userId },
      data: { pinLockedUntil: null },
    }),
  ]);
}

export function getPinLockMessage(lockedUntil: Date) {
  const remainingMinutes = Math.max(
    1,
    Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000),
  );
  return `PIN gesperrt. Bitte in ${remainingMinutes} Minute${remainingMinutes === 1 ? "" : "n"} erneut versuchen.`;
}

export const pinSecurity = {
  maxAttempts: MAX_PIN_ATTEMPTS,
  lockWindowMs: PIN_LOCK_WINDOW_MS,
};
