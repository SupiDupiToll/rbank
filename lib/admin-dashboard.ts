import { prisma } from "@/lib/prisma";
import { calculateBalanceCents } from "@/lib/banking";
import { settleMaturedFestgeldAccounts } from "@/lib/festgeld";

export type AdminUserRow = {
  customerId: string;
  displayName: string | null;
  stackUserId: string;
  balanceCents: number;
};

export type AdminTransaction = {
  id: string;
  type: "INCOMING" | "OUTGOING";
  amount: number;
  description: string;
  source: "ADMIN" | "TRANSFER";
  transferId: string | null;
  date: Date;
};

export type AdminFestgeld = {
  id: string;
  user: { stackUserId: string; customerId: string; displayName: string | null };
  label: string;
  amount: number;
  interestRate: number;
  status: "ACTIVE" | "UNLOCKED" | "PAID_OUT";
  startDate: Date;
  endDate: Date;
};

export async function getAdminDashboardData() {
  await settleMaturedFestgeldAccounts();

  const [users, accounts] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        customerId: true,
        displayName: true,
        stackUserId: true,
        transactions: { select: { type: true, amount: true } }
      }
    }),
    prisma.festgeldAccount.findMany({
      orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: { stackUserId: true, customerId: true, displayName: true }
        }
      }
    })
  ]);

  const mappedUsers = users.map((customer) => ({
    customerId: customer.customerId,
    displayName: customer.displayName,
    stackUserId: customer.stackUserId,
    balanceCents: calculateBalanceCents(customer.transactions)
  }));

  const selectedUserId = users[0]?.id;
  const initialTransactions = selectedUserId
    ? await prisma.transaction.findMany({
        where: { userId: selectedUserId },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          source: true,
          transferId: true,
          date: true,
          createdAt: true
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }]
      })
    : [];

  return {
    users: mappedUsers,
    festgeldAccounts: accounts,
    initialTransactions
  };
}
