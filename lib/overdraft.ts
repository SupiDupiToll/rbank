import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DAILY_OVERDRAFT_INTEREST_RATE = 0.03;
const DAY_MS = 24 * 60 * 60 * 1000;

function getUtcDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getUtcDayEnd(date: Date) {
  return new Date(getUtcDayStart(date).getTime() + DAY_MS - 1);
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function getUtcDayKey(date: Date) {
  return getUtcDayStart(date).getTime();
}

export function calculateOverdraftInterestCents(balanceCents: number) {
  if (balanceCents >= 0) {
    return 0;
  }

  return Math.max(1, Math.round(Math.abs(balanceCents) * DAILY_OVERDRAFT_INTEREST_RATE));
}

async function settleOverdraftInterestForUser(userId: string) {
  await prisma.$transaction(async (tx) => {
    const transactions = await tx.transaction.findMany({
      where: { userId, currency: "EUR" },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: {
        type: true,
        amount: true,
        date: true,
        source: true,
      },
    });

    if (transactions.length === 0) {
      return;
    }

    const todayStart = getUtcDayStart(new Date());
    const lastDayToSettle = addUtcDays(todayStart, -1);
    const settledDays = new Set<number>();

    for (const transaction of transactions) {
      if (transaction.source === "OVERDRAFT_INTEREST" && transaction.date < todayStart) {
        settledDays.add(getUtcDayKey(transaction.date));
      }
    }

    let balanceCents = 0;
    let transactionIndex = 0;
    const firstDay = getUtcDayStart(transactions[0].date);

    for (
      let currentDay = firstDay;
      currentDay.getTime() <= lastDayToSettle.getTime();
      currentDay = addUtcDays(currentDay, 1)
    ) {
      const currentDayKey = currentDay.getTime();

      while (
        transactionIndex < transactions.length &&
        getUtcDayKey(transactions[transactionIndex].date) === currentDayKey
      ) {
        const transaction = transactions[transactionIndex];
        balanceCents +=
          transaction.type === "INCOMING" ? transaction.amount : -transaction.amount;
        transactionIndex += 1;
      }

      if (balanceCents >= 0 || settledDays.has(currentDayKey)) {
        continue;
      }

      const interestAmount = calculateOverdraftInterestCents(balanceCents);
      if (interestAmount <= 0) {
        continue;
      }

      await tx.transaction.create({
        data: {
          userId,
          type: "OUTGOING",
          amount: interestAmount,
          currency: "EUR",
          description: `Dispokreditzins ${currentDay.toISOString().slice(0, 10)}`,
          source: "OVERDRAFT_INTEREST",
          date: getUtcDayEnd(currentDay),
        },
      });

      balanceCents -= interestAmount;
      settledDays.add(currentDayKey);
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function settleOverdraftInterest(userId?: string) {
  if (userId) {
    await settleOverdraftInterestForUser(userId);
    return;
  }

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true },
  });

  for (const customer of customers) {
    await settleOverdraftInterestForUser(customer.id);
  }
}
