import { z } from "zod";
import { NextResponse } from "next/server";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { authenticateMerchantRequest } from "@/lib/payments";
import {
  applyPayoutSideEffects,
  createPayout,
  serializePayout,
} from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import {
  amountCentsSchema,
  customerIdSchema,
  emailSchema,
  safeTextSchema,
} from "@/lib/security";

export async function POST(request: Request) {
  const { merchant, error } = await authenticateMerchantRequest(request);
  if (error || !merchant) {
    return error;
  }

  if (!merchant.userId) {
    return NextResponse.json(
      {
        error:
          "Diesem Merchant ist kein Owner-Konto zugewiesen. Bitte im Admin-Panel einen Besitzer hinterlegen.",
      },
      { status: 422 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltige Eingabedaten." },
      { status: 400 },
    );
  }

  const parsedBody = z
    .object({
      amount: amountCentsSchema,
      currency: z.literal("EUR").default("EUR"),
      customerId: customerIdSchema.optional(),
      email: emailSchema.optional(),
      description: safeTextSchema(120),
      metadata: z.record(z.string(), z.string()).optional(),
      idempotencyKey: z
        .string()
        .trim()
        .min(1)
        .max(64)
        .optional(),
    })
    .refine(
      (value) =>
        Boolean(value.customerId) !== Boolean(value.email),
      "Empfaenger angeben (customerId oder email).",
    )
    .safeParse(rawBody);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Ungueltige Eingabedaten." },
      { status: 400 },
    );
  }

  await settleCustomerAccounting(merchant.userId);

  try {
    const { payout, replay } = await createPayout({
      merchantDbId: merchant.id,
      merchantName: merchant.name,
      ownerUserId: merchant.userId,
      amount: parsedBody.data.amount,
      description: parsedBody.data.description,
      metadata: parsedBody.data.metadata,
      idempotencyKey: parsedBody.data.idempotencyKey,
      recipientCustomerId: parsedBody.data.customerId,
      recipientEmail: parsedBody.data.email,
    });

    await applyPayoutSideEffects(payout);

    return NextResponse.json(serializePayout(payout), {
      status: replay ? 200 : 201,
    });
  } catch (caughtError) {
    if (caughtError instanceof Error) {
      if (caughtError.message === "RECIPIENT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Empfaenger wurde nicht gefunden." },
          { status: 404 },
        );
      }

      if (caughtError.message === "SELF_PAYOUT_NOT_ALLOWED") {
        return NextResponse.json(
          { error: "Auszahlungen an das eigene Konto sind nicht erlaubt." },
          { status: 400 },
        );
      }

      if (caughtError.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json(
          { error: "Nicht genuegend Deckung auf dem Owner-Konto." },
          { status: 422 },
        );
      }
    }

    throw caughtError;
  }
}

export async function GET(request: Request) {
  const { merchant, error } = await authenticateMerchantRequest(request);
  if (error || !merchant) {
    return error;
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.round(rawLimit), 1), 200)
    : 50;

  const payouts = await prisma.payout.findMany({
    where: { merchantDbId: merchant.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      merchant: { select: { name: true } },
      payerUser: { select: { customerId: true, displayName: true } },
      recipientUser: { select: { customerId: true, displayName: true } },
    },
  });

  return NextResponse.json({ payouts: payouts.map(serializePayout) });
}
