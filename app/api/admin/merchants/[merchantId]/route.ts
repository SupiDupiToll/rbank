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
import { merchantIdSchema, safeTextSchema } from "@/lib/security";
import { invalidateGlobalData } from "@/lib/cache";

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

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.adminApi,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    const { merchantId } = await context.params;
    const parsedMerchantId = parseInput(merchantIdSchema, merchantId);

    const body = await parseJsonBody(
      request,
      z.object({
        name: safeTextSchema(80),
        webhookUrl: z.string().nullish(),
        isActive: z.boolean(),
        customerId: z.string().nullish(),
      }),
    );

    let ownerUserId: string | null | undefined = undefined;
    if (body.customerId !== undefined) {
      if (body.customerId) {
        const ownerUser = await prisma.user.findUnique({
          where: { customerId: body.customerId },
          select: { id: true },
        });
        if (!ownerUser) {
          return NextResponse.json(
            { error: "Kunde nicht gefunden." },
            { status: 404 },
          );
        }
        ownerUserId = ownerUser.id;
      } else {
        ownerUserId = null;
      }
    }

    const merchant = await prisma.merchant.update({
      where: { merchantId: parsedMerchantId },
      data: {
        name: body.name,
        allowedRedirectUrls: [],
        webhookUrl: body.webhookUrl ?? null,
        isActive: body.isActive,
        userId: ownerUserId,
      },
    });

    invalidateGlobalData();

    return NextResponse.json({ merchant });
  });
}
