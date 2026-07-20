import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseInput,
  parseJsonBody,
  requireAdmin,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { amountCentsSchema, cuidSchema, safeTextSchema } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

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

    const { id } = await context.params;
    parseInput(cuidSchema, id);

    const body = await parseJsonBody(
      request,
      z.object({
        name: safeTextSchema(80).optional(),
        description: safeTextSchema(500).optional(),
        minAmount: amountCentsSchema.optional(),
        maxAmount: amountCentsSchema.optional(),
        minTermMonths: z.number().int().min(1).max(120).optional(),
        maxTermMonths: z.number().int().min(1).max(120).optional(),
        interestRate: z.number().min(0).max(100).optional(),
        isActive: z.boolean().optional(),
      }),
    );

    const product = await prisma.loanProduct.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ product });
  });
}
