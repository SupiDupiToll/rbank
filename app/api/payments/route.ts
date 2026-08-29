import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireCustomerWithPin,
  safeRoute,
} from "@/lib/api-helpers";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { verifyPin } from "@/lib/pin";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { amountCentsSchema, cuidSchema, pinSchema } from "@/lib/security";
import { refreshWalletPassForUser } from "@/lib/wallet/service";

export async function POST(request: Request) {
  return safeRoute(async () => {
    const { error, user: currentUser } = await requireCustomerWithPin();
    if (error || !currentUser) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.customerTransfer,
      currentUser.id,
    );
    if (rateLimitError) return rateLimitError;

    await settleCustomerAccounting(currentUser.id);

    const body = await parseJsonBody(
      request,
      z
        .object({
          // Modus 1 (Zahlungslink): eingeloggter Nutzer ist Empfänger, payerUserId zahlt
          payerUserId: cuidSchema.optional(),
          // Modus 2 (QR-Scan): eingeloggter Nutzer ist Zahler, recipientUserId empfängt
          recipientUserId: cuidSchema.optional(),
          amount: amountCentsSchema,
          pin: pinSchema,
        })
        .refine(
          (value) =>
            Boolean(value.payerUserId) !== Boolean(value.recipientUserId),
          "Genau ein Konto angeben.",
        ),
    );

    const payerUserId = body.payerUserId ?? currentUser.id;
    const recipientUserId = body.recipientUserId ?? currentUser.id;

    if (payerUserId === recipientUserId) {
      return NextResponse.json(
        { error: "Zahlungen vom eigenen Konto sind nicht erlaubt." },
        { status: 400 },
      );
    }

    const transferId = randomUUID();
    const date = new Date();

    const transferResult = await prisma
      .$transaction(
        async (tx) => {
          const payer = await tx.user.findUnique({
            where: { id: payerUserId },
            select: {
              id: true,
              customerId: true,
              role: true,
              paymentPinHash: true,
            },
          });

          const recipient = await tx.user.findUnique({
            where: { id: recipientUserId },
            select: {
              id: true,
              customerId: true,
              role: true,
            },
          });

          if (
            !payer ||
            payer.role !== "CUSTOMER" ||
            !payer.paymentPinHash ||
            !recipient ||
            recipient.role !== "CUSTOMER"
          ) {
            throw new Error("PAYMENT_REJECTED");
          }

          const isValidPin = await verifyPin(body.pin, payer.paymentPinHash);

          if (!isValidPin) {
            throw new Error("INVALID_PIN");
          }

          const outgoingTransaction = await tx.transaction.create({
            data: {
              userId: payer.id,
              type: "OUTGOING",
              amount: body.amount,
              currency: "EUR",
              description: `Zahlung an ${recipient.customerId}`,
              date,
              source: "TRANSFER",
              transferId,
            },
          });

          const incomingTransaction = await tx.transaction.create({
            data: {
              userId: recipient.id,
              type: "INCOMING",
              amount: body.amount,
              currency: "EUR",
              description: `Zahlung von ${payer.customerId}`,
              date,
              source: "TRANSFER",
              transferId,
            },
          });

          return { outgoingTransaction, incomingTransaction };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((caughtError: unknown) => {
        if (
          caughtError instanceof Error &&
          caughtError.message === "INVALID_PIN"
        ) {
          return "INVALID_PIN" as const;
        }

        if (
          caughtError instanceof Error &&
          caughtError.message === "PAYMENT_REJECTED"
        ) {
          return null;
        }

        throw caughtError;
      });

    if (transferResult === "INVALID_PIN") {
      return NextResponse.json({ error: "PIN ist falsch." }, { status: 400 });
    }

    if (!transferResult) {
      return NextResponse.json(
        { error: "Zahlung konnte nicht ausgefuehrt werden." },
        { status: 400 },
      );
    }

    void refreshWalletPassForUser(payerUserId);
    void refreshWalletPassForUser(recipientUserId);

    return NextResponse.json(
      {
        success: true,
        transferId,
      },
      { status: 201 },
    );
  });
}
