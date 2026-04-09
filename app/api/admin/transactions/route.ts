import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireAdmin,
  safeRoute
} from "@/lib/api-helpers";
import { TransactionType } from "@prisma/client";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { amountCentsSchema, customerIdSchema, isoDateStringSchema, safeTextSchema } from "@/lib/security";

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
        customerId: customerIdSchema,
        type: z.nativeEnum(TransactionType),
        amount: amountCentsSchema,
        description: safeTextSchema(120),
        date: isoDateStringSchema
      })
    );

    const accountHolder = await prisma.user.findUnique({
      where: { customerId: body.customerId },
      select: { id: true, role: true }
    });

    if (!accountHolder || accountHolder.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Ungueltige Daten." }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: accountHolder.id,
        type: body.type,
        amount: body.amount,
        description: body.description,
        date: body.date,
        source: "ADMIN"
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        source: true,
        transferId: true,
        date: true,
        createdAt: true
      }
    });

    return NextResponse.json({ transaction }, { status: 201 });
  });
}
