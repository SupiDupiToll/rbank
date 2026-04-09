import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function calculateBalanceCents(
  transactions: Array<{ type: "INCOMING" | "OUTGOING"; amount: number }>
) {
  return transactions.reduce((sum, transaction) => {
    return sum + (transaction.type === "INCOMING" ? transaction.amount : -transaction.amount);
  }, 0);
}

export async function getUserBalanceCents(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { type: true, amount: true }
  });

  return calculateBalanceCents(transactions);
}

export function generateCustomerId() {
  return randomInt(10_000_000, 100_000_000).toString();
}
