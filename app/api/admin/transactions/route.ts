import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncUserBalance } from "@/lib/balance";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireAdmin,
  safeRoute,
} from "@/lib/api-helpers";
import { TransactionCurrency, TransactionType } from "@prisma/client";
import { rateLimitPolicies } from "@/lib/rate-limit";
import {
  amountCentsSchema,
  customerIdSchema,
  isoDateStringSchema,
  safeTextSchema,
} from "@/lib/security";

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
        customerId: customerIdSchema,
        type: z.nativeEnum(TransactionType),
        currency: z.nativeEnum(TransactionCurrency).default("EUR"),
        amount: amountCentsSchema,
        description: safeTextSchema(120),
        date: isoDateStringSchema,
      }),
    );

    const accountHolder = await prisma.user.findUnique({
      where: { customerId: body.customerId },
      select: { id: true, role: true },
    });

    if (!accountHolder || accountHolder.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Ungueltige Daten." }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: accountHolder.id,
        type: body.type,
        amount: body.amount,
        currency: body.currency,
        description: body.description,
        date: body.date,
        source: "ADMIN",
      },
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        description: true,
        source: true,
        transferId: true,
        date: true,
        createdAt: true,
      },
    });

    await syncUserBalance(accountHolder.id);

    return NextResponse.json({ transaction }, { status: 201 });
  });
}

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

    const url = new URL(request.url);
    const currencyInput = url.searchParams.get("currency");
    const currency: TransactionCurrency | null =
      currencyInput === "EUR" || currencyInput === "AIR"
        ? currencyInput
        : null;

    if (currencyInput && currency === null) {
      return NextResponse.json({ error: "Ungueltige Daten." }, { status: 400 });
    }

    const transactions = await prisma.transaction.findMany({
      where: currency ? { currency } : undefined,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        description: true,
        source: true,
        transferId: true,
        date: true,
        createdAt: true,
        user: {
          select: {
            customerId: true,
            displayName: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        source: transaction.source,
        transferId: transaction.transferId,
        date: transaction.date,
        customerId: transaction.user.customerId,
        customerName: transaction.user.displayName,
      })),
    });
  });
}
