import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateMerchantRequest,
  createPaymentExpiryDate,
  generatePaymentToken,
  getCheckoutPaymentUrl,
  isRedirectUrlAllowed,
} from "@/lib/payments";
import { amountCentsSchema, safeTextSchema, urlSchema } from "@/lib/security";

export async function POST(request: Request) {
  const { merchant, error } = await authenticateMerchantRequest(request);
  if (error || !merchant) {
    return error;
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltige Eingabedaten." }, { status: 400 });
  }

  const parsedBody = z
    .object({
      amount: amountCentsSchema,
      currency: z.literal("EUR").default("EUR"),
      description: safeTextSchema(120),
      redirectUrl: urlSchema,
      cancelUrl: urlSchema,
      metadata: z.record(z.string(), z.string()).optional(),
    })
    .safeParse(rawBody);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Ungueltige Eingabedaten." }, { status: 400 });
  }

  if (
    !isRedirectUrlAllowed(merchant.allowedRedirectUrls, parsedBody.data.redirectUrl) ||
    !isRedirectUrlAllowed(merchant.allowedRedirectUrls, parsedBody.data.cancelUrl)
  ) {
    return NextResponse.json(
      { error: "Redirect-URL ist nicht fuer diesen Haendler freigegeben." },
      { status: 400 },
    );
  }

  const token = generatePaymentToken();
  const expiresAt = createPaymentExpiryDate();
  const session = await prisma.paymentSession.create({
    data: {
      merchantDbId: merchant.id,
      amount: parsedBody.data.amount,
      currency: parsedBody.data.currency,
      description: parsedBody.data.description,
      redirectUrl: parsedBody.data.redirectUrl,
      cancelUrl: parsedBody.data.cancelUrl,
      metadataJson: parsedBody.data.metadata ?? {},
      token,
      expiresAt,
    },
  });

  return NextResponse.json({
    token: session.token,
    paymentUrl: getCheckoutPaymentUrl(session.token),
    expiresAt: session.expiresAt.toISOString(),
  });
}
