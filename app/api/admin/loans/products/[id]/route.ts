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

export async function PUT(request: Request, context: Params) {
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
    const productId = parseInput(cuidSchema, id);

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
        oneTimeFeeCents: z.number().int().min(0).nullable().optional(),
      }),
    );

    if (body.minAmount != null && body.maxAmount != null && body.maxAmount < body.minAmount) {
      return NextResponse.json({ error: "Maximalbetrag muss >= Minimalbetrag sein." }, { status: 400 });
    }

    if (body.minTermMonths != null && body.maxTermMonths != null && body.maxTermMonths < body.minTermMonths) {
      return NextResponse.json({ error: "Maximallaufzeit muss >= Minimallaufzeit sein." }, { status: 400 });
    }

    const product = await prisma.loanProduct.update({
      where: { id: productId },
      data: body,
    });

    return NextResponse.json({ product });
  });
}

export async function DELETE(request: Request, context: Params) {
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
    const productId = parseInput(cuidSchema, id);

    await prisma.loanProduct.delete({ where: { id: productId } });

    return NextResponse.json({ success: true });
  });
}
