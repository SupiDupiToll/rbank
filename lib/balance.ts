import { prisma } from "@/lib/prisma";
import { calculateBalanceCents } from "@/lib/banking";
import { refreshWalletPassForUser } from "@/lib/wallet/service";

export async function syncUserBalance(userId: string) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { balanceCents: true },
  });

  const transactions = await prisma.transaction.findMany({
    where: { userId, currency: "EUR" },
    select: { type: true, amount: true },
  });
  const balanceCents = calculateBalanceCents(transactions, "EUR");

  if (current?.balanceCents === balanceCents) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { balanceCents },
  });
  await refreshWalletPassForUser(userId);
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
