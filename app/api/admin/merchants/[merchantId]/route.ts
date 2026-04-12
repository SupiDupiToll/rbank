import { z } from "zod";
import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  parseInput,
  requireAdmin,
  safeRoute,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { merchantIdSchema, safeTextSchema, urlSchema } from "@/lib/security";

type Params = {
  params: Promise<{ merchantId: string }>;
};

export async function PATCH(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { merchantId } = await context.params;
    const parsedMerchantId = parseInput(merchantIdSchema, merchantId);

    const body = await parseJsonBody(
      request,
      z.object({
        name: safeTextSchema(80),
        allowedRedirectUrls: z.array(urlSchema).min(1),
        webhookUrl: urlSchema.nullish(),
        isActive: z.boolean(),
      }),
    );

    const merchant = await prisma.merchant.update({
      where: { merchantId: parsedMerchantId },
      data: {
        name: body.name,
        allowedRedirectUrls: body.allowedRedirectUrls,
        webhookUrl: body.webhookUrl ?? null,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ merchant });
  });
}
