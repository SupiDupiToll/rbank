import { z } from "zod";
import { randomUUID } from "node:crypto";
import { Prisma, TransactionCurrency } from "@prisma/client";
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
import {
  amountCentsSchema,
  customerIdSchema,
  emailSchema,
  pinSchema,
  safeTextSchema,
} from "@/lib/security";
import { verifyPin } from "@/lib/pin";
import { refreshWalletPassForUser } from "@/lib/wallet/service";
import { stackServerApp } from "@/stack/server";
import { invalidateGlobalData, invalidateUserData } from "@/lib/cache";

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
      z
        .object({
          recipientCustomerId: customerIdSchema.optional(),
          recipientEmail: emailSchema.optional(),
          amount: amountCentsSchema,
          currency: z.nativeEnum(TransactionCurrency),
          description: safeTextSchema(120),
          pin: pinSchema,
        })
        .refine(
          (value) =>
            Boolean(value.recipientCustomerId) !== Boolean(value.recipientEmail),
          "Empfänger angeben.",
        ),
    );

    const isPinValid = await verifyPin(body.pin, user.paymentPinHash);

    if (!isPinValid) {
      return NextResponse.json(
        { error: "PIN ist nicht korrekt." },
        { status: 403 },
      );
    }

    const recipient = await resolveRecipient(body.recipientCustomerId, body.recipientEmail);

    if (!recipient) {
      return NextResponse.json(
        { error: "Empfaenger wurde nicht gefunden." },
        { status: 404 },
      );
    }

    if (recipient.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Empfaenger wurde nicht gefunden." },
        { status: 404 },
      );
    }

    if (recipient.id === user.id) {
      return NextResponse.json(
        {
          error:
            "Ueberweisungen an das eigene Konto sind nicht erlaubt.",
        },
        { status: 400 },
      );
    }

    const transferId = randomUUID();
    const date = new Date();
    const transferResult = await prisma
      .$transaction(
        async (tx) => {
          const outgoingTransaction = await tx.transaction.create({
            data: {
              userId: user.id,
              type: "OUTGOING",
              amount: body.amount,
              currency: body.currency,
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
              currency: body.currency,
              description: `Ueberweisung von ${user.customerId} · ${body.description}`,
              date,
              source: "TRANSFER",
              transferId,
            },
            select: {
              id: true,
              userId: true,
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
      );

    if (!transferResult) {
      return NextResponse.json(
        { error: "Ueberweisung konnte nicht ausgefuehrt werden." },
        { status: 400 },
      );
    }

    void refreshWalletPassForUser(user.id);
    void refreshWalletPassForUser(transferResult.incomingTransaction.userId);
    invalidateUserData(user.id);
    invalidateUserData(transferResult.incomingTransaction.userId);
    invalidateGlobalData();

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

async function resolveRecipient(
  recipientCustomerId: string | undefined,
  recipientEmail: string | undefined,
) {
  if (recipientCustomerId) {
    return prisma.user.findUnique({
      where: { customerId: recipientCustomerId },
      select: { id: true, customerId: true, role: true },
    });
  }

  if (recipientEmail) {
    const stackUsers = await stackServerApp.listUsers({ query: recipientEmail });
    const matchedStackUser = stackUsers.find(
      (stackUser) => stackUser.primaryEmail?.trim().toLowerCase() === recipientEmail,
    );

    if (!matchedStackUser) {
      return null;
    }

    return prisma.user.findUnique({
      where: { stackUserId: matchedStackUser.id },
      select: { id: true, customerId: true, role: true },
    });
  }

  return null;
}
