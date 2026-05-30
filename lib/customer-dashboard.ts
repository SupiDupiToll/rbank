import { prisma } from "@/lib/prisma";
import { getBalancesByCurrency } from "@/lib/banking";
import { settleCustomerAccounting } from "@/lib/customer-accounting";

export async function getCustomerDashboardData(userId: string) {
  await settleCustomerAccounting(userId);

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
