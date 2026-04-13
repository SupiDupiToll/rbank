import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateBalanceCents } from "@/lib/banking";
import {
  clearCheckoutCookie,
  decryptWebhookSecret,
  expireStalePaymentSession,
} from "@/lib/payments";

type PaymentSessionRecord = Prisma.PaymentSessionGetPayload<{
  include: {
    merchant: true;
    user: {
      select: {
        id: true;
        customerId: true;
        displayName: true;
      };
    };
  };
}>;

export async function getPaymentSessionByToken(token: string) {
  await expireStalePaymentSession(token);

  return prisma.paymentSession.findUnique({
    where: { token },
    include: {
      merchant: true,
      user: {
        select: {
          id: true,
          customerId: true,
          displayName: true,
        },
      },
    },
  });
}

export function serializePaymentSession(session: PaymentSessionRecord) {
  return {
    token: session.token,
    status:
      session.status === "PENDING" && session.expiresAt.getTime() <= Date.now()
        ? "EXPIRED"
        : session.status,
    amount: session.amount,
    currency: session.currency,
    description: session.description,
    redirectUrl: session.redirectUrl,
    cancelUrl: session.cancelUrl,
    merchant: {
      name: session.merchant.name,
      merchantId: session.merchant.merchantId,
    },
    paidAt: session.paidAt?.toISOString() ?? null,
    expiresAt: session.expiresAt.toISOString(),
    customerId: session.user?.customerId ?? null,
    customerName: session.user?.displayName ?? null,
    metadata: session.metadataJson ?? {},
    transactionId: session.completedTransactionId,
    refundedAt: session.refundedAt?.toISOString() ?? null,
  };
}

export async function getCheckoutUserSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      customerId: true,
      displayName: true,
      transactions: {
        select: { type: true, amount: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    customerId: user.customerId,
    displayName: user.displayName ?? `Kunde ${user.customerId}`,
    balanceCents: calculateBalanceCents(user.transactions),
  };
}

export async function sendMerchantWebhook(sessionToken: string) {
  const session = await prisma.paymentSession.findUnique({
    where: { token: sessionToken },
    include: {
      merchant: true,
      user: {
        select: {
          customerId: true,
        },
      },
    },
  });

  if (
    !session?.merchant.webhookUrl ||
    !session.paidAt ||
    !session.user ||
    !session.merchant.webhookSecretEnc
  ) {
    return;
  }

  const payload = {
    token: session.token,
    status: session.status,
    amount: session.amount,
    paidAt: session.paidAt.toISOString(),
    customerId: session.user.customerId,
  };

  const { createHmac } = await import("node:crypto");
  const signature = createHmac(
    "sha256",
    decryptWebhookSecret(session.merchant.webhookSecretEnc),
  )
    .update(JSON.stringify(payload))
    .digest("hex");

  let delayMs = 500;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(session.merchant.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RBank-Signature": signature,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Retry below.
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
}

export async function completeCheckoutPayment(token: string, userId: string) {
  const paidAt = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      const session = await tx.paymentSession.findUnique({
        where: { token },
        include: {
          merchant: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!session) {
        throw new Error("NOT_FOUND");
      }

      if (session.status !== "PENDING") {
        throw new Error(session.status);
      }

      if (session.expiresAt.getTime() <= Date.now()) {
        await tx.paymentSession.update({
          where: { id: session.id },
          data: { status: "EXPIRED" },
        });
        throw new Error("EXPIRED");
      }

      const payer = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          customerId: true,
          displayName: true,
          transactions: {
            select: { type: true, amount: true },
          },
        },
      });

      if (!payer) {
        throw new Error("USER_NOT_FOUND");
      }

      const balanceCents = calculateBalanceCents(payer.transactions);
      if (balanceCents < session.amount) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      const description = `Checkout an ${session.merchant.name} · ${session.description}`;

      const transaction = await tx.transaction.create({
        data: {
          userId: payer.id,
          type: "OUTGOING",
          amount: session.amount,
          description,
          source: "CHECKOUT",
          date: paidAt,
          paymentSessionId: session.id,
        },
      });

      const updatedSession = await tx.paymentSession.update({
        where: { id: session.id },
        data: {
          status: "COMPLETED",
          userId: payer.id,
          paidAt,
          completedTransactionId: transaction.id,
        },
        include: {
          merchant: true,
          user: {
            select: {
              id: true,
              customerId: true,
              displayName: true,
            },
          },
        },
      });

      return { session: updatedSession, transactionId: transaction.id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  void sendMerchantWebhook(token);
  await clearCheckoutCookie(token);

  return result;
}

export async function cancelPaymentSession(token: string) {
  const session = await getPaymentSessionByToken(token);

  if (!session) {
    return null;
  }

  if (session.status === "PENDING") {
    await prisma.paymentSession.update({
      where: { id: session.id },
      data: { status: "CANCELLED" },
    });
  }

  await clearCheckoutCookie(token);
  return true;
}

export async function refundCompletedPayment(token: string) {
  return prisma.$transaction(
    async (tx) => {
      const session = await tx.paymentSession.findUnique({
        where: { token },
        include: {
          merchant: true,
          user: {
            select: {
              id: true,
              customerId: true,
            },
          },
        },
      });

      if (!session || !session.userId || session.status !== "COMPLETED") {
        throw new Error("REFUND_NOT_ALLOWED");
      }

      const refundDate = new Date();
      const refundTransaction = await tx.transaction.create({
        data: {
          userId: session.userId,
          type: "INCOMING",
          amount: session.amount,
          description: `Rueckerstattung von ${session.merchant.name} · ${session.description}`,
          source: "REFUND",
          date: refundDate,
          paymentSessionId: session.id,
        },
      });

      return tx.paymentSession.update({
        where: { id: session.id },
        data: {
          status: "REFUNDED",
          refundTransactionId: refundTransaction.id,
          refundedAt: refundDate,
        },
        include: {
          merchant: true,
          user: {
            select: {
              id: true,
              customerId: true,
              displayName: true,
            },
          },
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
