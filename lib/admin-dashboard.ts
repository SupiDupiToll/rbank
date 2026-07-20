import { prisma } from "@/lib/prisma";
import { calculateBalanceCents, getBalancesByCurrency } from "@/lib/banking";
import { settleCustomerAccounting } from "@/lib/customer-accounting";

export type AdminUserRow = {
  customerId: string;
  displayName: string | null;
  stackUserId: string;
  balanceCents: number;
  airBalance: number;
};

export type AdminTransaction = {
  id: string;
  type: "INCOMING" | "OUTGOING";
  amount: number;
  currency: "EUR" | "AIR";
  description: string;
  source: "ADMIN" | "TRANSFER" | "CHECKOUT" | "DONATION" | "REFUND" | "OVERDRAFT_INTEREST" | "LOAN_DISBURSEMENT" | "LOAN_REPAYMENT";
  transferId: string | null;
  date: Date;
};

export type AdminAirTransaction = AdminTransaction & {
  customerId: string;
  customerName: string | null;
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

export type AdminLoan = {
  id: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  remainingAmount: number;
  status: "PENDING" | "APPROVED" | "ACTIVE" | "COMPLETED" | "REJECTED" | "CANCELLED";
  purpose: string | null;
  createdAt: Date;
  approvedAt: Date | null;
  paidOffAt: Date | null;
  user: { customerId: string; displayName: string | null };
  loanProduct: { name: string } | null;
};

export type AdminLoanProduct = {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  interestRate: number;
  isActive: boolean;
};

export type AdminMerchantSession = {
  token: string;
  amount: number;
  currency: string;
  description: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  customerId: string | null;
  customerName: string | null;
  paidAt: Date | null;
  createdAt: Date;
  refundedAt: Date | null;
};

export type AdminMerchant = {
  id: string;
  name: string;
  merchantId: string;
  webhookUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  sessionCount: number;
  totalVolumeCents: number;
  volumeTodayCents: number;
  volumeMonthCents: number;
  sessions: AdminMerchantSession[];
};

export async function getAdminDashboardData() {
  await settleCustomerAccounting();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [users, accounts, merchants, loanProducts, pendingLoans, activeLoans, completedLoans] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        customerId: true,
        displayName: true,
        stackUserId: true,
        transactions: { select: { type: true, amount: true, currency: true } }
      }
    }),
    prisma.festgeldAccount.findMany({
      orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: { stackUserId: true, customerId: true, displayName: true }
        }
      }
    }),
    prisma.merchant.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        paymentSessions: {
          orderBy: [{ createdAt: "desc" }],
          include: {
            user: {
              select: {
                customerId: true,
                displayName: true,
              },
            },
          },
        },
      },
    }),
    prisma.loanProduct.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.loan.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { customerId: true, displayName: true } },
        loanProduct: { select: { name: true } },
      },
    }),
    prisma.loan.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { customerId: true, displayName: true } },
        loanProduct: { select: { name: true } },
      },
    }),
    prisma.loan.findMany({
      where: { status: "COMPLETED" },
      orderBy: { paidOffAt: "desc" },
      take: 20,
      include: {
        user: { select: { customerId: true, displayName: true } },
        loanProduct: { select: { name: true } },
      },
    }),
  ]);

  const mappedUsers = users.map((customer) => ({
    customerId: customer.customerId,
    displayName: customer.displayName,
    stackUserId: customer.stackUserId,
    balanceCents: calculateBalanceCents(customer.transactions, "EUR"),
    airBalance: calculateBalanceCents(customer.transactions, "AIR")
  }));

  const selectedUserId = users[0]?.id;
  const initialTransactions = selectedUserId
    ? await prisma.transaction.findMany({
        where: { userId: selectedUserId },
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          description: true,
          source: true,
          transferId: true,
          date: true,
          createdAt: true
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }]
      })
    : [];

  const allAirTransactions = await prisma.transaction.findMany({
    where: { currency: "AIR" },
    select: {
      id: true,
      type: true,
      amount: true,
      currency: true,
      description: true,
      source: true,
      transferId: true,
      date: true,
      createdAt: true,
      user: {
        select: {
          customerId: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const airSummary = getBalancesByCurrency(
    allAirTransactions.map((transaction) => ({
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
    })),
  );

  return {
    users: mappedUsers,
    festgeldAccounts: accounts,
    initialTransactions,
    airInCirculation: airSummary.airBalance,
    airTransactions: allAirTransactions.map((transaction) => ({
      ...transaction,
      customerId: transaction.user.customerId,
      customerName: transaction.user.displayName,
    })),
    loanProducts,
    pendingLoans,
    activeLoans,
    completedLoans,
    merchants: merchants.map((merchant) => {
      const completedSessions = merchant.paymentSessions.filter(
        (session) =>
          session.status === "COMPLETED" || session.status === "REFUNDED",
      );

      return {
        id: merchant.id,
        name: merchant.name,
        merchantId: merchant.merchantId,
        webhookUrl: merchant.webhookUrl,
        isActive: merchant.isActive,
        createdAt: merchant.createdAt,
        sessionCount: merchant.paymentSessions.length,
        totalVolumeCents: completedSessions.reduce(
          (sum, session) => sum + session.amount,
          0,
        ),
        volumeTodayCents: completedSessions
          .filter((session) => (session.paidAt ?? session.createdAt) >= startOfToday)
          .reduce((sum, session) => sum + session.amount, 0),
        volumeMonthCents: completedSessions
          .filter((session) => (session.paidAt ?? session.createdAt) >= startOfMonth)
          .reduce((sum, session) => sum + session.amount, 0),
        sessions: merchant.paymentSessions.map((session) => ({
          token: session.token,
          amount: session.amount,
          currency: session.currency,
          description: session.description,
          status: session.status,
          customerId: session.user?.customerId ?? null,
          customerName: session.user?.displayName ?? null,
          paidAt: session.paidAt,
          createdAt: session.createdAt,
          refundedAt: session.refundedAt,
        })),
      };
    }),
  };
}
