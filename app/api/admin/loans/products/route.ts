import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireAdmin,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { amountCentsSchema, safeTextSchema } from "@/lib/security";

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    const products = await prisma.loanProduct.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products });
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

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    const body = await parseJsonBody(
      request,
      z.object({
        name: safeTextSchema(80),
        description: safeTextSchema(500),
        minAmount: amountCentsSchema,
        maxAmount: amountCentsSchema,
        minTermMonths: z.number().int().min(1).max(120),
        maxTermMonths: z.number().int().min(1).max(120),
        interestRate: z.number().min(0).max(100),
      }),
    );

    if (body.maxAmount < body.minAmount) {
      return NextResponse.json({ error: "Maximalbetrag muss >= Minimalbetrag sein." }, { status: 400 });
    }

    if (body.maxTermMonths < body.minTermMonths) {
      return NextResponse.json({ error: "Maximallaufzeit muss >= Minimallaufzeit sein." }, { status: 400 });
    }

    const product = await prisma.loanProduct.create({ data: body });

    return NextResponse.json({ product }, { status: 201 });
  });
}
