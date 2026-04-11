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
import { calculateBalanceCents } from "@/lib/banking";
import { verifyPin } from "@/lib/pin";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { amountCentsSchema, cuidSchema, pinSchema } from "@/lib/security";

export async function POST(request: Request) {
  return safeRoute(async () => {
    const { error, user: recipient } = await requireCustomerWithPin();
    if (error || !recipient) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.customerTransfer,
      recipient.id,
    );
    if (rateLimitError) return rateLimitError;

    const body = await parseJsonBody(
      request,
      z.object({
        payerUserId: cuidSchema,
        amount: amountCentsSchema,
        pin: pinSchema,
      }),
    );

    if (body.payerUserId === recipient.id) {
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
            where: { id: body.payerUserId },
            select: {
              id: true,
              customerId: true,
              role: true,
              pinHash: true,
            },
          });

          if (!payer || payer.role !== "CUSTOMER" || !payer.pinHash) {
            throw new Error("PAYMENT_REJECTED");
          }

          const isValidPin = await verifyPin(body.pin, payer.pinHash);

          if (!isValidPin) {
            throw new Error("INVALID_PIN");
          }

          const payerTransactions = await tx.transaction.findMany({
            where: { userId: payer.id },
            select: { type: true, amount: true },
          });

          const payerBalanceCents = calculateBalanceCents(payerTransactions);

          if (payerBalanceCents < body.amount) {
            throw new Error("PAYMENT_REJECTED");
          }

          const outgoingTransaction = await tx.transaction.create({
            data: {
              userId: payer.id,
              type: "OUTGOING",
              amount: body.amount,
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

    return NextResponse.json(
      {
        success: true,
        transferId,
      },
      { status: 201 },
    );
  });
}
