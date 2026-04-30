import { randomInt } from "node:crypto";
import { TransactionCurrency } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function calculateBalanceCents(
  transactions: Array<{
    type: "INCOMING" | "OUTGOING";
    amount: number;
    currency?: TransactionCurrency;
  }>,
  currency: TransactionCurrency = "EUR",
) {
  return transactions.reduce((sum, transaction) => {
    if ((transaction.currency ?? "EUR") !== currency) {
      return sum;
    }

    return sum + (transaction.type === "INCOMING" ? transaction.amount : -transaction.amount);
  }, 0);
}

export async function getUserBalanceCents(
  userId: string,
  currency: TransactionCurrency = "EUR",
) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { type: true, amount: true, currency: true }
  });

  return calculateBalanceCents(transactions, currency);
}

export function getBalancesByCurrency(
  transactions: Array<{
    type: "INCOMING" | "OUTGOING";
    amount: number;
    currency?: TransactionCurrency;
  }>,
) {
  return {
    eurBalanceCents: calculateBalanceCents(transactions, "EUR"),
    airBalance: calculateBalanceCents(transactions, "AIR"),
  };
}

export function generateCustomerId() {
  return randomInt(10_000_000, 100_000_000).toString();
}
