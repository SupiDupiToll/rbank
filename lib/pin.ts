import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pinSchema } from "@/lib/security";

const scrypt = promisify(scryptCallback);
const SALT_BYTES = 16;
const KEY_BYTES = 64;

export async function hashPin(pin: string) {
  const normalizedPin = pinSchema.parse(pin);
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = (await scrypt(normalizedPin, salt, KEY_BYTES)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPin(pin: string, pinHash: string | null | undefined) {
  if (!pinHash) {
    return false;
  }

  const normalizedPin = pinSchema.parse(pin);
  const [salt, storedHash] = pinHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(normalizedPin, salt, KEY_BYTES)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedKey);
}
