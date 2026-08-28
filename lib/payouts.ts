import { Prisma } from "@prisma/client";
import { calculateBalanceCents } from "@/lib/banking";
import { syncUserBalance } from "@/lib/balance";
import { invalidateGlobalData, invalidateUserData } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { refreshWalletPassForUser } from "@/lib/wallet/service";
import { stackServerApp } from "@/stack/server";

export type PayoutCreateInput = {
  merchantDbId: string;
  merchantName: string;
  ownerUserId: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
  recipientCustomerId?: string;
  recipientEmail?: string;
};

export type PayoutWithRelations = Prisma.PayoutGetPayload<{
  include: {
    merchant: { select: { name: true } };
    payerUser: { select: { customerId: true; displayName: true } };
    recipientUser: { select: { customerId: true; displayName: true } };
  };
}>;

const payoutInclude = {
  merchant: { select: { name: true } },
  payerUser: { select: { customerId: true, displayName: true } },
  recipientUser: { select: { customerId: true, displayName: true } },
} as const;

export function serializePayout(payout: PayoutWithRelations) {
  return {
    id: payout.id,
    status: "COMPLETED" as const,
    amount: payout.amount,
    currency: payout.currency,
    description: payout.description,
    metadata: payout.metadataJson ?? {},
    merchantName: payout.merchant.name,
    customerId: payout.recipientUser.customerId,
    customerName: payout.recipientUser.displayName ?? null,
    payoutDate: payout.payoutDate.toISOString(),
    createdAt: payout.createdAt.toISOString(),
    outgoingTransactionId: payout.outgoingTransactionId,
    incomingTransactionId: payout.incomingTransactionId,
  };
}

async function resolvePayoutRecipient(input: {
  recipientCustomerId?: string;
  recipientEmail?: string;
}) {
  if (input.recipientCustomerId) {
    return prisma.user.findUnique({
      where: { customerId: input.recipientCustomerId },
      select: { id: true, customerId: true, displayName: true, role: true },
    });
  }

  if (input.recipientEmail) {
    const email = input.recipientEmail.trim().toLowerCase();
    const stackUsers = await stackServerApp.listUsers({ query: email });
    const matchedStackUser = stackUsers.find(
      (stackUser) =>
        stackUser.primaryEmail?.trim().toLowerCase() === email,
    );

    if (!matchedStackUser) {
      return null;
    }

    return prisma.user.findUnique({
      where: { stackUserId: matchedStackUser.id },
      select: { id: true, customerId: true, displayName: true, role: true },
    });
  }

  return null;
}

async function findExistingPayout(merchantDbId: string, idempotencyKey: string) {
  const payout = await prisma.payout.findUnique({
    where: {
      merchantDbId_idempotencyKey: { merchantDbId, idempotencyKey },
    },
    include: payoutInclude,
  });

  return payout;
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Executes a payout from the merchant's owner account to a customer.
 *
 * Debits the owner account (OUTGOING) and credits the recipient (INCOMING)
 * inside a single serializable transaction. Fails when the owner account
 * does not cover the amount. When `idempotencyKey` is provided, a second
 * call with the same key returns the previously created payout instead of
 * paying out twice.
 */
export async function createPayout(input: PayoutCreateInput) {
  if (input.idempotencyKey) {
    const existing = await findExistingPayout(
      input.merchantDbId,
      input.idempotencyKey,
    );
    if (existing) {
      return { payout: existing, replay: true };
    }
  }

  const recipient = await resolvePayoutRecipient(input);
  if (!recipient || recipient.role !== "CUSTOMER") {
    throw new Error("RECIPIENT_NOT_FOUND");
  }

  if (recipient.id === input.ownerUserId) {
    throw new Error("SELF_PAYOUT_NOT_ALLOWED");
  }

  const payoutDate = new Date();

  try {
    const payout = await prisma.$transaction(
      async (tx) => {
        const ownerTransactions = await tx.transaction.findMany({
          where: { userId: input.ownerUserId, currency: "EUR" },
          select: { type: true, amount: true },
        });
        const ownerBalance = calculateBalanceCents(ownerTransactions, "EUR");

        if (ownerBalance < input.amount) {
          throw new Error("INSUFFICIENT_FUNDS");
        }

        const outgoingTransaction = await tx.transaction.create({
          data: {
            userId: input.ownerUserId,
            type: "OUTGOING",
            amount: input.amount,
            currency: "EUR",
            description: `Auszahlung an ${recipient.customerId} · ${input.description}`,
            date: payoutDate,
            source: "PAYOUT",
          },
        });

        const incomingTransaction = await tx.transaction.create({
          data: {
            userId: recipient.id,
            type: "INCOMING",
            amount: input.amount,
            currency: "EUR",
            description: `Auszahlung von ${input.merchantName} · ${input.description}`,
            date: payoutDate,
            source: "PAYOUT",
          },
        });

        return tx.payout.create({
          data: {
            merchantDbId: input.merchantDbId,
            payerUserId: input.ownerUserId,
            recipientUserId: recipient.id,
            amount: input.amount,
            currency: "EUR",
            description: input.description,
            metadataJson: input.metadata ?? {},
            idempotencyKey: input.idempotencyKey ?? null,
            payoutDate,
            outgoingTransactionId: outgoingTransaction.id,
            incomingTransactionId: incomingTransaction.id,
          },
          include: payoutInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return { payout, replay: false };
  } catch (error) {
    if (isUniqueConstraintError(error) && input.idempotencyKey) {
      // A concurrent request already created this payout — return it instead
      // of paying out twice.
      const existing = await findExistingPayout(
        input.merchantDbId,
        input.idempotencyKey,
      );
      if (existing) {
        return { payout: existing, replay: true };
      }
    }

    throw error;
  }
}

export async function applyPayoutSideEffects(payout: PayoutWithRelations) {
  await syncUserBalance(payout.payerUserId);
  await syncUserBalance(payout.recipientUserId);
  void refreshWalletPassForUser(payout.payerUserId);
  void refreshWalletPassForUser(payout.recipientUserId);
  invalidateUserData(payout.payerUserId);
  invalidateUserData(payout.recipientUserId);
  invalidateGlobalData();
}
