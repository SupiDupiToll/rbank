import { prisma } from "@/lib/prisma";
import { calculateBalanceCents } from "@/lib/banking";

export async function syncUserBalance(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { userId, currency: "EUR" },
    select: { type: true, amount: true },
  });
  const balanceCents = calculateBalanceCents(transactions, "EUR");
  await prisma.user.update({
    where: { id: userId },
    data: { balanceCents },
  });
}

export async function syncAllUserBalances() {
  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true },
  });
  for (const user of users) {
    await syncUserBalance(user.id);
  }
}
