import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireCustomerWithPin,
  safeRoute,
} from "@/lib/api-helpers";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { amountCentsSchema, pinSchema } from "@/lib/security";
import { verifyPin } from "@/lib/pin";
import { syncUserBalance } from "@/lib/balance";
import { sendEmailToAddress } from "@/lib/email";
import { cardNotifyEmail } from "@/lib/env";
import { formatEuroFromCents } from "@/lib/money";

export async function POST(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomerWithPin();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.customerTransfer,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    await settleCustomerAccounting(user.id);

    const body = await parseJsonBody(
      request,
      z.object({
        amount: amountCentsSchema,
        pin: pinSchema,
      }),
    );

    const isPinValid = await verifyPin(body.pin, user.paymentPinHash);
    if (!isPinValid) {
      return NextResponse.json(
        { error: "PIN ist nicht korrekt." },
        { status: 403 },
      );
    }

    const card = await prisma.card.findUnique({
      where: { userId: user.id },
      select: {
        balanceCents: true,
        cardLastFour: true,
        phoneNumber: true,
        status: true,
      },
    });

    if (!card || card.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Es ist keine aktivierte Karte vorhanden." },
        { status: 404 },
      );
    }

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { balanceCents: true },
    });

    if (!account || account.balanceCents < body.amount) {
      return NextResponse.json(
        { error: "Der verfuegbare Kontostand reicht nicht aus." },
        { status: 400 },
      );
    }

    const date = new Date();
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "OUTGOING",
        amount: body.amount,
        currency: "EUR",
        description: `Karte aufladen · •••• ${card.cardLastFour}`,
        date,
        source: "CARD_TOPUP",
      },
    });

    const updatedCard = await prisma.card.update({
      where: { userId: user.id },
      data: { balanceCents: card.balanceCents + body.amount },
      select: {
        balanceCents: true,
        cardLastFour: true,
        phoneNumber: true,
        status: true,
      },
    });

    await syncUserBalance(user.id);

    await sendEmailToAddress(
      cardNotifyEmail,
      "RBank Karte aufgeladen",
      `<p>Die RBank-Kreditkarte wurde aufgeladen.</p>
<p><strong>Telefonnummer:</strong> ${card.phoneNumber}</p>
<p><strong>Betrag:</strong> ${formatEuroFromCents(body.amount)}</p>`,
    );

    return NextResponse.json({
      card: updatedCard,
      amount: body.amount,
    });
  });
}