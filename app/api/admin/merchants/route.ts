import { z } from "zod";
import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireAdmin,
  safeRoute,
} from "@/lib/api-helpers";
import { getAdminDashboardData } from "@/lib/admin-dashboard";
import {
  encryptWebhookSecret,
  generateMerchantCredentials,
  hashMerchantSecret,
  hashWebhookSecret,
} from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { safeTextSchema, urlSchema } from "@/lib/security";

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.adminApi,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    const data = await getAdminDashboardData();
    return NextResponse.json({ merchants: data.merchants });
  });
}

export async function POST(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.adminApi,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    const body = await parseJsonBody(
      request,
      z.object({
        name: safeTextSchema(80),
        allowedRedirectUrls: z.array(urlSchema).min(1),
        webhookUrl: urlSchema.nullish(),
      }),
    );

    const credentials = generateMerchantCredentials();
    const merchantSecretHash = await hashMerchantSecret(
      credentials.merchantSecret,
    );
    const webhookSecretHash = await hashWebhookSecret(
      credentials.webhookSecret,
    );
    const webhookSecretEnc = encryptWebhookSecret(credentials.webhookSecret);

    const merchant = await prisma.merchant.create({
      data: {
        name: body.name,
        merchantId: credentials.merchantId,
        merchantSecretHash,
        webhookSecretHash,
        webhookSecretEnc,
        allowedRedirectUrls: body.allowedRedirectUrls,
        webhookUrl: body.webhookUrl ?? null,
      },
    });

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        name: merchant.name,
        merchantId: merchant.merchantId,
        allowedRedirectUrls: merchant.allowedRedirectUrls,
        webhookUrl: merchant.webhookUrl,
        isActive: merchant.isActive,
        createdAt: merchant.createdAt,
      },
      merchantSecret: credentials.merchantSecret,
      webhookSecret: credentials.webhookSecret,
    });
  });
}
