import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/env";
import {
  generateMerchantCredentials,
  hashMerchantSecret,
  hashWebhookSecret,
} from "@/lib/payments";
import { MAX_NAME_LENGTH, MAX_SLUG_LENGTH, sanitizePlainText } from "@/lib/security";

const DONATION_MERCHANT_ID = "00000000-0000-4000-8000-000000000001";
const DONATION_MERCHANT_NAME = "RBank Spendenbox";

function normalizeSlugPart(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);

  return normalized.length >= 3 ? normalized : "spendenbox";
}

export function sanitizeDonationBoxName(value: string) {
  return sanitizePlainText(value, MAX_NAME_LENGTH);
}

export async function generateUniqueDonationBoxSlug(name: string) {
  const baseSlug = normalizeSlugPart(name);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${randomBytes(2).toString("hex")}`;
    const slug = `${baseSlug}${suffix}`.slice(0, MAX_SLUG_LENGTH);
    const existing = await prisma.donationBox.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }
  }

  return `${baseSlug}-${randomBytes(3).toString("hex")}`.slice(
    0,
    MAX_SLUG_LENGTH,
  );
}

export function getDonationBoxUrl(slug: string) {
  return `${appOrigin}/spendenbox/${slug}`;
}

export async function ensureDonationMerchant() {
  const existing = await prisma.merchant.findUnique({
    where: { merchantId: DONATION_MERCHANT_ID },
  });

  if (existing) {
    return existing;
  }

  const credentials = generateMerchantCredentials();
  const [merchantSecretHash, webhookSecretHash] = await Promise.all([
    hashMerchantSecret(credentials.merchantSecret),
    hashWebhookSecret(credentials.webhookSecret),
  ]);

  return prisma.merchant.create({
    data: {
      name: DONATION_MERCHANT_NAME,
      merchantId: DONATION_MERCHANT_ID,
      merchantSecretHash,
      webhookSecretHash,
      allowedRedirectUrls: [appOrigin],
      isActive: true,
    },
  });
}
