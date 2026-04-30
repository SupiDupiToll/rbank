import { z } from "zod";
import { NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-helpers";
import {
  completeCheckoutPayment,
  getPaymentSessionByToken,
} from "@/lib/payment-gateway";
import { getCheckoutCookieUserId, getPaymentStatus } from "@/lib/payments";
import {
  clearPinAttempts,
  getPinAttemptsRemaining,
  getPinLockMessage,
  recordFailedPinAttempt,
  verifyPin,
} from "@/lib/pin";
import { prisma } from "@/lib/prisma";
import { paymentTokenSchema, pinSchema } from "@/lib/security";

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, context: Params) {
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
    return NextResponse.json({ error: "Zahlung ist nicht mehr verfuegbar.", status }, { status: 409 });
  }

  const userId = await getCheckoutCookieUserId(parsedToken.data);
  if (!userId) {
    return NextResponse.json({ error: "Checkout-Anmeldung fehlt." }, { status: 401 });
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
      pin: pinSchema,
    })
    .safeParse(rawBody);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "PIN ist nicht korrekt." },
      { status: 400 },
    );
  }

  const customer = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      paymentPinHash: true,
      pinLockedUntil: true,
    },
  });

  if (!customer || !customer.paymentPinHash) {
    return NextResponse.json(
      { error: "PIN ist nicht eingerichtet.", remainingAttempts: 0 },
      { status: 403 },
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
          : "PIN ist nicht korrekt.",
        remainingAttempts: getPinAttemptsRemaining(failedAttempt.recentAttempts),
        lockedUntil: failedAttempt.lockedUntil?.toISOString() ?? null,
      },
      { status: failedAttempt.lockedUntil ? 423 : 401 },
    );
  }

  await clearPinAttempts(customer.id, getRequestIp(request));

  try {
    const result = await completeCheckoutPayment(parsedToken.data, userId);
    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      redirectUrl: `${result.session.redirectUrl}${result.session.redirectUrl.includes("?") ? "&" : "?"}token=${result.session.token}&status=success`,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json({ error: "Nicht genug Guthaben." }, { status: 409 });
      }

      if (error.message === "SELF_DONATION_NOT_ALLOWED") {
        return NextResponse.json(
          { error: "Eigene Spendenboxen koennen nicht selbst bezahlt werden." },
          { status: 409 },
        );
      }

      if (["EXPIRED", "COMPLETED", "CANCELLED", "REFUNDED"].includes(error.message)) {
        return NextResponse.json({ error: "Zahlung ist nicht mehr verfuegbar.", status: error.message }, { status: 409 });
      }
    }

    throw error;
  }
}
