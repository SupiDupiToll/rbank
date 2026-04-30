import { prisma } from "@/lib/prisma";
import { getBalancesByCurrency } from "@/lib/banking";
import { settleMaturedFestgeldAccounts } from "@/lib/festgeld";

export async function getCustomerDashboardData(userId: string) {
  await settleMaturedFestgeldAccounts(userId);

  const [transactions, festgeldAccounts] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }]
    }),
    prisma.festgeldAccount.findMany({
      where: { userId },
      orderBy: [{ endDate: "asc" }, { createdAt: "desc" }]
    })
  ]);

  const { eurBalanceCents, airBalance } = getBalancesByCurrency(transactions);

  return {
    balanceCents: eurBalanceCents,
    airBalance,
    transactions,
    festgeldAccounts
  };
}
