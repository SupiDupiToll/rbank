import { z } from "zod";
import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceSameOrigin,
  requireCustomer,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import {
  createPaymentExpiryDate,
  generatePaymentToken,
  getCheckoutPaymentUrl,
  setCheckoutCookie,
} from "@/lib/payments";
import { ensureDonationMerchant } from "@/lib/donation-boxes";
import {
  amountCentsSchema,
  donationBoxSlugSchema,
  safeTextSchema,
} from "@/lib/security";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: Params) {
  const { error, user } = await requireCustomer();
  if (error || !user) {
    return NextResponse.json(
      { error: "Bitte zuerst anmelden.", loginRequired: true },
      { status: 401 },
    );
  }

  const originError = enforceSameOrigin(request);
  if (originError) return originError;

  const csrfError = enforceCsrf(request);
  if (csrfError) return csrfError;

  const { slug } = await context.params;
  const parsedSlug = donationBoxSlugSchema.safeParse(slug);

  if (!parsedSlug.success) {
    return NextResponse.json(
      { error: "Spendenbox nicht gefunden." },
      { status: 404 },
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
      description: safeTextSchema(120).optional(),
    })
    .safeParse(rawBody);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Ungueltige Eingabedaten." },
      { status: 400 },
    );
  }

  const donationBox = await prisma.donationBox.findUnique({
    where: { slug: parsedSlug.data },
    include: {
      user: {
        select: {
          id: true,
          customerId: true,
          displayName: true,
        },
      },
    },
  });

  if (!donationBox || !donationBox.isActive) {
    return NextResponse.json(
      { error: "Spendenbox nicht gefunden." },
      { status: 404 },
    );
  }

  if (donationBox.userId === user.id) {
    return NextResponse.json(
      { error: "Eigene Spendenboxen koennen nicht selbst bezahlt werden." },
      { status: 409 },
    );
  }

  const merchant = await ensureDonationMerchant();
  const token = generatePaymentToken();
  const expiresAt = createPaymentExpiryDate();
  const redirectUrl = new URL(`/spendenbox/${donationBox.slug}`, request.url).toString();
  const cancelUrl = redirectUrl;

  const session = await prisma.paymentSession.create({
    data: {
      merchantDbId: merchant.id,
      amount: parsedBody.data.amount,
      currency: "EUR",
      description:
        parsedBody.data.description ?? `Spende fuer ${donationBox.name}`,
      redirectUrl,
      cancelUrl,
      metadataJson: {
        donationBoxSlug: donationBox.slug,
        donationBoxName: donationBox.name,
      },
      token,
      expiresAt,
      recipientUserId: donationBox.userId,
      donationBoxId: donationBox.id,
    },
  });

  await setCheckoutCookie(session.token, user.id);

  return NextResponse.json({
    token: session.token,
    paymentUrl: getCheckoutPaymentUrl(session.token),
    expiresAt: session.expiresAt.toISOString(),
  });
}
