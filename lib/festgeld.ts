import { Prisma, type FestgeldAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateBalanceCents } from "@/lib/banking";

export function getFestgeldDurationDays(startDate: Date, endDate: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay),
  );
}

export function calculateFestgeldInterestCents(
  amount: number,
  interestRate: number,
  startDate: Date,
  endDate: Date,
) {
  const durationDays = getFestgeldDurationDays(startDate, endDate);
  return Math.round(amount * (interestRate / 100) * (durationDays / 365));
}

export function isFestgeldUnlocked(
  account: Pick<FestgeldAccount, "status" | "endDate">,
) {
  return (
    account.status === "UNLOCKED" ||
    (account.status === "ACTIVE" && account.endDate <= new Date())
  );
}

export async function settleMaturedFestgeldAccounts(userId?: string) {
  const maturedAccounts = await prisma.festgeldAccount.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lte: new Date() },
      ...(userId ? { userId } : {}),
    },
    select: {
      id: true,
      userId: true,
    },
  });

  for (const account of maturedAccounts) {
    await prisma.$transaction(async (tx) => {
      const currentAccount = await tx.festgeldAccount.findUnique({
        where: { id: account.id },
      });

      if (
        !currentAccount ||
        currentAccount.status !== "ACTIVE" ||
        currentAccount.endDate > new Date()
      ) {
        return;
      }

      const interestAmount = calculateFestgeldInterestCents(
        currentAccount.amount,
        currentAccount.interestRate,
        currentAccount.startDate,
        currentAccount.endDate,
      );

      if (interestAmount > 0) {
        await tx.transaction.create({
          data: {
            userId: currentAccount.userId,
            type: "INCOMING",
            amount: interestAmount,
            currency: "EUR",
            description: `Festgeldzins ${currentAccount.label}`,
            source: "ADMIN",
            date: new Date(),
          },
        });
      }

      await tx.festgeldAccount.update({
        where: { id: currentAccount.id },
        data: {
          status: "UNLOCKED",
          interestCreditedAt: new Date(),
        },
      });
    });
  }
}

export async function createFestgeldAccount(input: {
  userId: string;
  label: string;
  amount: number;
  interestRate: number;
  startDate: Date;
  endDate: Date;
}) {
  await settleMaturedFestgeldAccounts(input.userId);

  return prisma.$transaction(
    async (tx) => {
      const transactions = await tx.transaction.findMany({
        where: { userId: input.userId, currency: "EUR" },
        select: { type: true, amount: true, currency: true },
      });

      const balanceCents = calculateBalanceCents(transactions, "EUR");
      if (balanceCents < input.amount) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      const lockTransaction = await tx.transaction.create({
        data: {
          userId: input.userId,
          type: "OUTGOING",
          amount: input.amount,
          currency: "EUR",
          description: `Festgeldanlage ${input.label}`,
          source: "ADMIN",
          date: input.startDate,
        },
      });

      const account = await tx.festgeldAccount.create({
        data: {
          ...input,
          lockedTransactionId: lockTransaction.id,
        },
      });

      return { account, lockTransaction };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function payoutUnlockedFestgeldAccount(accountId: string) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.festgeldAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error("FESTGELD_NOT_FOUND");
    }

    if (account.status !== "UNLOCKED") {
      throw new Error("FESTGELD_NOT_UNLOCKED");
    }

    const payoutDate = new Date();

    const payoutTransaction = await tx.transaction.create({
      data: {
        userId: account.userId,
        type: "INCOMING",
        amount: account.amount,
        currency: "EUR",
        description: `Festgeldauszahlung ${account.label}`,
        source: "ADMIN",
        date: payoutDate,
      },
    });

    const updatedAccount = await tx.festgeldAccount.update({
      where: { id: account.id },
      data: {
        status: "PAID_OUT",
        payoutDate,
        payoutTransactionId: payoutTransaction.id,
      },
    });

    return { payoutTransaction, updatedAccount };
  });
}
