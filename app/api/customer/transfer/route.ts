import { z } from "zod";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
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
import { calculateBalanceCents } from "@/lib/banking";
import { rateLimitPolicies } from "@/lib/rate-limit";
import {
  amountCentsSchema,
  customerIdSchema,
  pinSchema,
  safeTextSchema,
} from "@/lib/security";
import { verifyPin } from "@/lib/pin";
import {
  buildOutgoingTransactionNotification,
  buildTransferReceivedNotification,
  sendToUser,
} from "@/lib/push-service";

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

    const body = await parseJsonBody(
      request,
      z.object({
        recipientCustomerId: customerIdSchema,
        amount: amountCentsSchema,
        description: safeTextSchema(120),
        pin: pinSchema,
      }),
    );

    const isPinValid = await verifyPin(body.pin, user.pinHash);

    if (!isPinValid) {
      return NextResponse.json(
        { error: "PIN ist nicht korrekt." },
        { status: 403 },
      );
    }

    if (body.recipientCustomerId === user.customerId) {
      return NextResponse.json(
        {
          error:
            "Ueberweisungen an die eigene Kundennummer sind nicht erlaubt.",
        },
        { status: 400 },
      );
    }

    const transferId = randomUUID();
    const date = new Date();
    const transferResult = await prisma
      .$transaction(
        async (tx) => {
          const recipient = await tx.user.findUnique({
            where: { customerId: body.recipientCustomerId },
            select: { id: true, customerId: true, role: true },
          });

          const senderTransactions = await tx.transaction.findMany({
            where: { userId: user.id },
            select: { type: true, amount: true },
          });

          const senderBalanceCents = calculateBalanceCents(senderTransactions);

          if (
            !recipient ||
            recipient.role !== "CUSTOMER" ||
            senderBalanceCents < body.amount
          ) {
            throw new Error("TRANSFER_REJECTED");
          }

          const outgoingTransaction = await tx.transaction.create({
            data: {
              userId: user.id,
              type: "OUTGOING",
              amount: body.amount,
              description: `Ueberweisung an ${recipient.customerId} · ${body.description}`,
              date,
              source: "TRANSFER",
              transferId,
            },
            select: {
              id: true,
              type: true,
              amount: true,
              description: true,
              source: true,
              transferId: true,
              date: true,
              createdAt: true,
            },
          });

          const incomingTransaction = await tx.transaction.create({
            data: {
              userId: recipient.id,
              type: "INCOMING",
              amount: body.amount,
              description: `Ueberweisung von ${user.customerId} · ${body.description}`,
              date,
              source: "TRANSFER",
              transferId,
            },
            select: {
              id: true,
              type: true,
              amount: true,
              description: true,
              source: true,
              transferId: true,
              date: true,
              createdAt: true,
            },
          });

          return { outgoingTransaction, incomingTransaction };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === "TRANSFER_REJECTED") {
          return null;
        }

        throw error;
      });

    if (!transferResult) {
      return NextResponse.json(
        { error: "Ueberweisung konnte nicht ausgefuehrt werden." },
        { status: 400 },
      );
    }

    // Send push notifications (fire-and-forget, non-blocking)
    sendToUser(
      user.id,
      buildOutgoingTransactionNotification(body.amount),
    ).catch(console.error);

    const recipientUser = await prisma.user.findUnique({
      where: { customerId: body.recipientCustomerId },
      select: { id: true, displayName: true },
    });
    if (recipientUser) {
      sendToUser(
        recipientUser.id,
        buildTransferReceivedNotification(
          user.displayName ?? user.customerId,
          body.amount,
        ),
      ).catch(console.error);
    }

    return NextResponse.json(
      {
        transferId,
        outgoingTransaction: transferResult.outgoingTransaction,
        incomingTransaction: transferResult.incomingTransaction,
      },
      { status: 201 },
    );
  });
}
