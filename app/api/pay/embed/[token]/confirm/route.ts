import { z } from "zod";
import { NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-helpers";
import {
  completeCheckoutPayment,
  getPaymentSessionByToken,
} from "@/lib/payment-gateway";
import { getPaymentStatus, isValidEmbedCheckoutKey } from "@/lib/payments";
import {
  clearPinAttempts,
  getPinAttemptsRemaining,
  getPinLockMessage,
  recordFailedPinAttempt,
  verifyPin,
} from "@/lib/pin";
import { prisma } from "@/lib/prisma";
import { customerIdSchema, paymentTokenSchema, pinSchema } from "@/lib/security";

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, context: Params) {
  const url = new URL(request.url);
  const embedKey = url.searchParams.get("key");

  if (!isValidEmbedCheckoutKey(embedKey)) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }

  const { token } = await context.params;
  const parsedToken = paymentTokenSchema.safeParse(token);
  if (!parsedToken.success) {
    return NextResponse.json({ error: "Ungueltiger Token." }, { status: 400 });
  }

  const session = await getPaymentSessionByToken(parsedToken.data);
  if (!session) {
    return NextResponse.json({ error: "Zahlung nicht gefunden." }, { status: 404 });
  }

  const status = getPaymentStatus(session);
  if (status !== "PENDING") {
    return NextResponse.json(
      { error: "Zahlung ist nicht mehr verfuegbar.", status },
      { status: 409 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltige Eingabedaten." }, { status: 400 });
  }

  const parsedBody = z
    .object({
      customerId: customerIdSchema,
      pin: pinSchema,
    })
    .safeParse(rawBody);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Ungueltige Eingabedaten." }, { status: 400 });
  }

  const customer = await prisma.user.findUnique({
    where: { customerId: parsedBody.data.customerId },
    select: {
      id: true,
      customerId: true,
      displayName: true,
      role: true,
      paymentPinHash: true,
      pinLockedUntil: true,
    },
  });

  if (!customer || customer.role !== "CUSTOMER" || !customer.paymentPinHash) {
    return NextResponse.json(
      { error: "Kundennummer oder PIN ist nicht korrekt.", remainingAttempts: 0 },
      { status: 401 },
    );
  }

  if (customer.pinLockedUntil && customer.pinLockedUntil.getTime() > Date.now()) {
    return NextResponse.json(
      {
        error: getPinLockMessage(customer.pinLockedUntil),
        remainingAttempts: 0,
        lockedUntil: customer.pinLockedUntil.toISOString(),
      },
      { status: 423 },
    );
  }

  const isValidPin = await verifyPin(parsedBody.data.pin, customer.paymentPinHash);
  if (!isValidPin) {
    const ip = getRequestIp(request);
    const failedAttempt = await recordFailedPinAttempt(customer.id, ip);
    return NextResponse.json(
      {
        error: failedAttempt.lockedUntil
          ? getPinLockMessage(failedAttempt.lockedUntil)
          : "Kundennummer oder PIN ist nicht korrekt.",
        remainingAttempts: getPinAttemptsRemaining(failedAttempt.recentAttempts),
        lockedUntil: failedAttempt.lockedUntil?.toISOString() ?? null,
      },
      { status: failedAttempt.lockedUntil ? 423 : 401 },
    );
  }

  await clearPinAttempts(customer.id, getRequestIp(request));

  try {
    const result = await completeCheckoutPayment(parsedToken.data, customer.id);
    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      redirectUrl: `${result.session.redirectUrl}${result.session.redirectUrl.includes("?") ? "&" : "?"}token=${result.session.token}&status=success`,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SELF_DONATION_NOT_ALLOWED") {
        return NextResponse.json(
          { error: "Eigene Spendenboxen koennen nicht selbst bezahlt werden." },
          { status: 409 },
        );
      }

      if (["EXPIRED", "COMPLETED", "CANCELLED", "REFUNDED"].includes(error.message)) {
        return NextResponse.json(
          { error: "Zahlung ist nicht mehr verfuegbar.", status: error.message },
          { status: 409 },
        );
      }
    }

    throw error;
  }
}
