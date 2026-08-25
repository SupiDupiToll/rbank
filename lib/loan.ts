import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { settleOverdraftInterest } from "@/lib/overdraft";
import { sendLoanReminderEmail } from "@/lib/email";

export function calculateAnnuity(amount: number, annualRate: number, termMonths: number) {
  if (amount <= 0 || termMonths <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return Math.round(amount / termMonths);
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return Math.round(amount * (monthlyRate * factor) / (factor - 1));
}

export function generateAmortizationSchedule(amount: number, annualRate: number, termMonths: number) {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = calculateAnnuity(amount, annualRate, termMonths);
  let remaining = amount;
  const schedule: Array<{
    installmentNumber: number;
    amount: number;
    principalPortion: number;
    interestPortion: number;
    remainingBalance: number;
  }> = [];
  let totalInterestScheduled = 0;

  for (let i = 1; i <= termMonths; i++) {
    const isLast = i === termMonths;
    let interestPortion: number;
    let principalPortion: number;
    let paymentAmount: number;

    if (isLast) {
      interestPortion = Math.round(remaining * monthlyRate);
      if (annualRate > 0 && remaining > 0 && interestPortion < 1) {
        interestPortion = 1;
      }
      principalPortion = remaining;
      paymentAmount = principalPortion + interestPortion;
    } else {
      interestPortion = Math.round(remaining * monthlyRate);
      if (annualRate > 0 && remaining > 0 && interestPortion < 1) {
        interestPortion = 1;
      }
      principalPortion = monthlyPayment - interestPortion;
      if (principalPortion < 0) {
        interestPortion = monthlyPayment;
        principalPortion = 0;
      } else if (principalPortion > remaining) {
        principalPortion = remaining;
        interestPortion = 0;
        paymentAmount = principalPortion;
      }
      paymentAmount = principalPortion + interestPortion;
    }

    totalInterestScheduled += interestPortion;
    remaining -= principalPortion;
    if (remaining < 0) remaining = 0;

    schedule.push({
      installmentNumber: i,
      amount: paymentAmount,
      principalPortion,
      interestPortion,
      remainingBalance: remaining,
    });
  }

  return { schedule, monthlyPayment };
}

export type LoanScheduleEntry = {
  installmentNumber: number;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
};

export function buildLoanSchedule(
  amount: number,
  annualRate: number,
  termMonths: number,
  oneTimeFeeCents?: number | null,
): { schedule: LoanScheduleEntry[]; monthlyPayment: number } {
  let schedule: LoanScheduleEntry[];
  let monthlyPayment: number;

  if (annualRate === 0 && oneTimeFeeCents && oneTimeFeeCents > 0) {
    monthlyPayment = Math.round(amount / termMonths);
    let remaining = amount;
    const flatSchedule: LoanScheduleEntry[] = [];
    for (let i = 1; i <= termMonths; i++) {
      const isLast = i === termMonths;
      const principalPortion = isLast ? remaining : monthlyPayment;
      const amt = isLast ? principalPortion + oneTimeFeeCents : principalPortion;
      remaining -= principalPortion;
      flatSchedule.push({
        installmentNumber: i,
        amount: amt,
        principalPortion,
        interestPortion: 0,
        remainingBalance: remaining,
      });
    }
    schedule = flatSchedule;
  } else {
    const result = generateAmortizationSchedule(amount, annualRate, termMonths);
    schedule = result.schedule;
    monthlyPayment = result.monthlyPayment;
  }

  return { schedule, monthlyPayment };
}

export async function approveLoan(loanId: string, adminUserId: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: { loanProduct: true },
    });

    if (!loan) throw new Error("LOAN_NOT_FOUND");
    if (loan.status !== "PENDING") throw new Error("LOAN_NOT_PENDING");

    const { schedule, monthlyPayment } = buildLoanSchedule(
      loan.amount,
      loan.interestRate,
      loan.termMonths,
      loan.oneTimeFeeCents,
    );
    let totalRepayment: number;
    let totalInterest: number;
    if (loan.interestRate === 0 && loan.oneTimeFeeCents && loan.oneTimeFeeCents > 0) {
      totalRepayment = loan.amount + loan.oneTimeFeeCents;
      totalInterest = 0;
    } else {
      totalRepayment = schedule.reduce((sum, p) => sum + p.amount, 0);
      totalInterest = totalRepayment - loan.amount;
    }

    const now = new Date();

    const disbursementTx = await tx.transaction.create({
      data: {
        userId: loan.userId,
        type: "INCOMING",
        amount: loan.amount,
        currency: "EUR",
        description: `Kreditauszahlung · ${loan.purpose ?? loan.loanProduct?.name ?? "Kredit"} (${loan.termMonths} Monate, ${loan.interestRate.toFixed(2)}%)`,
        source: "ADMIN",
        date: now,
      },
    });

    const scheduledDates = schedule.map((_, i) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() + i + 1);
      date.setDate(0);
      return date;
    });

    const updatedLoan = await tx.loan.update({
      where: { id: loanId },
      data: {
        status: "ACTIVE",
        monthlyPayment,
        totalInterest,
        totalRepayment,
        remainingAmount: loan.amount,
        approvedAt: now,
        approvedByUserId: adminUserId,
        disbursementTxId: disbursementTx.id,
      },
    });

    await tx.loanPayment.createMany({
      data: schedule.map((payment, i) => ({
        loanId,
        installmentNumber: payment.installmentNumber,
        scheduledDate: scheduledDates[i],
        amount: payment.amount,
        principalPortion: payment.principalPortion,
        interestPortion: payment.interestPortion,
        remainingBalance: payment.remainingBalance,
        status: "SCHEDULED",
      })),
    });

    return { updatedLoan, disbursementTx };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function rejectLoan(loanId: string) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw new Error("LOAN_NOT_FOUND");
  if (loan.status !== "PENDING") throw new Error("LOAN_NOT_PENDING");

  return prisma.loan.update({
    where: { id: loanId },
    data: { status: "REJECTED" },
  });
}

export async function getNextPayment(loanId: string) {
  return prisma.loanPayment.findFirst({
    where: { loanId, status: "SCHEDULED" },
    orderBy: { installmentNumber: "asc" },
  });
}

export async function makePayment(loanId: string, userId: string, allowOverdraft = false) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== userId) throw new Error("LOAN_NOT_FOUND");
    if (loan.status !== "ACTIVE") throw new Error("LOAN_NOT_ACTIVE");

    const nextPayment = await tx.loanPayment.findFirst({
      where: { loanId, status: "SCHEDULED" },
      orderBy: { installmentNumber: "asc" },
    });

    if (!nextPayment) throw new Error("NO_PAYMENT_DUE");

    if (!allowOverdraft) {
      const balance = await getUserBalanceCentsTx(tx, userId);
      if (balance < nextPayment.amount) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
    }

    const now = new Date();
    const paymentTx = await tx.transaction.create({
      data: {
        userId,
        type: "OUTGOING",
        amount: nextPayment.amount,
        currency: "EUR",
        description: `Kreditrate ${nextPayment.installmentNumber}/${loan.termMonths}`,
        source: "ADMIN",
        date: now,
      },
    });

    const updatedPayment = await tx.loanPayment.update({
      where: { id: nextPayment.id },
      data: {
        status: "PAID",
        paidAt: now,
        transactionId: paymentTx.id,
      },
    });

    const newRemaining = loan.remainingAmount - nextPayment.principalPortion;
    await tx.loan.update({
      where: { id: loanId },
      data: { remainingAmount: Math.max(0, newRemaining) },
    });

    const nextRemaining = await tx.loanPayment.findFirst({
      where: { loanId, status: "SCHEDULED" },
      orderBy: { installmentNumber: "asc" },
    });

    if (!nextRemaining) {
      await tx.loan.update({
        where: { id: loanId },
        data: { status: "COMPLETED", paidOffAt: now, remainingAmount: 0 },
      });
    }

    return { payment: updatedPayment, transaction: paymentTx };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function getUserBalanceCentsTx(tx: Prisma.TransactionClient, userId: string) {
  const transactions = await tx.transaction.findMany({
    where: { userId, currency: "EUR" },
    select: { type: true, amount: true },
  });
  return transactions.reduce(
    (sum, t) => sum + (t.type === "INCOMING" ? t.amount : -t.amount),
    0,
  );
}

export async function payoffLoan(loanId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== userId) throw new Error("LOAN_NOT_FOUND");
    if (loan.status !== "ACTIVE") throw new Error("LOAN_NOT_ACTIVE");

    const now = new Date();

    const unpaidPayments = await tx.loanPayment.findMany({
      where: { loanId, status: "SCHEDULED" },
      orderBy: { installmentNumber: "asc" },
    });

    if (unpaidPayments.length === 0) throw new Error("NO_PAYMENT_DUE");

    const monthlyRate = loan.interestRate / 100 / 12;
    const currentInterest = Math.round(loan.remainingAmount * monthlyRate);
    let totalPayoffAmount = loan.remainingAmount + currentInterest;
    if (loan.oneTimeFeeCents && loan.oneTimeFeeCents > 0 && !loan.oneTimeFeePaid) {
      totalPayoffAmount += loan.oneTimeFeeCents;
    }

    const balance = await getUserBalanceCentsTx(tx, userId);
    if (balance < totalPayoffAmount) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    const payoffTx = await tx.transaction.create({
      data: {
        userId,
        type: "OUTGOING",
        amount: totalPayoffAmount,
        currency: "EUR",
        description: "Kredit vorzeitig getilgt",
        source: "ADMIN",
        date: now,
      },
    });

    await tx.loanPayment.updateMany({
      where: { loanId, status: "SCHEDULED" },
      data: { status: "PAID", paidAt: now, transactionId: payoffTx.id },
    });

    await tx.loan.update({
      where: { id: loanId },
      data: {
        status: "COMPLETED",
        remainingAmount: 0,
        paidOffAt: now,
        oneTimeFeePaid: true,
      },
    });

    return { transaction: payoffTx, totalPayoffAmount };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function sendPaymentReminders(userId?: string) {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const threeDaysFromNowEnd = new Date(threeDaysFromNow);
  threeDaysFromNowEnd.setHours(23, 59, 59, 999);
  threeDaysFromNow.setHours(0, 0, 0, 0);

  const upcomingPayments = await prisma.loanPayment.findMany({
    where: {
      status: "SCHEDULED",
      scheduledDate: { gte: threeDaysFromNow, lte: threeDaysFromNowEnd },
      ...(userId ? { loan: { userId } } : {}),
    },
    include: {
      loan: {
        include: { user: { select: { stackUserId: true, displayName: true } } },
      },
    },
  });

  for (const payment of upcomingPayments) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (payment.lastReminderSentAt && payment.lastReminderSentAt >= todayStart) {
      continue;
    }

    const user = payment.loan.user;
    await sendLoanReminderEmail(
      user.stackUserId,
      "Kreditrate fällig in 3 Tagen",
      `<p>Hallo ${user.displayName ?? "Kunde"},</p>
       <p>Ihre Kreditrate über ${(payment.amount / 100).toFixed(2)} EUR ist am ${payment.scheduledDate.toLocaleDateString("de-DE")} fällig.</p>
       <p>Rate Nr. ${payment.installmentNumber}</p>`
    );

    await prisma.loanPayment.update({
      where: { id: payment.id },
      data: { lastReminderSentAt: now },
    });
  }

  return upcomingPayments.length;
}

export async function processDuePayments(userId?: string) {
  try {
    await sendPaymentReminders(userId);
  } catch {
    // Don't block payment processing
  }

  const where: Prisma.LoanPaymentWhereInput = {
    status: "SCHEDULED",
    scheduledDate: { lte: new Date() },
    ...(userId ? { loan: { userId } } : {}),
  };

  const duePayments = await prisma.loanPayment.findMany({
    where,
    include: { loan: { select: { userId: true } } },
    orderBy: { scheduledDate: "asc" },
  });

  const results: Array<{ paymentId: string; success: boolean; error?: string }> = [];

  for (const payment of duePayments) {
    try {
      await makePayment(payment.loanId, payment.loan.userId, true);
      await prisma.transaction.create({
        data: {
          userId: payment.loan.userId,
          type: "OUTGOING",
          amount: 100,
          currency: "EUR",
          description: "Auto-Abbuchungsgebühr",
          source: "ADMIN",
          date: new Date(),
        },
      });
      results.push({ paymentId: payment.id, success: true });
    } catch (error) {
      results.push({
        paymentId: payment.id,
        success: false,
        error: error instanceof Error ? error.message : "UNKNOWN",
      });
    }
  }

  return results;
}

export async function requestLoanExtension(
  loanId: string,
  userId: string,
  termMonths: number,
  reason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findFirst({ where: { id: loanId, userId } });
    if (!loan) throw new Error("LOAN_NOT_FOUND");
    if (loan.status !== "ACTIVE") throw new Error("LOAN_NOT_ACTIVE");

    const paidCount = await tx.loanPayment.count({
      where: { loanId, status: "PAID" },
    });
    if (Number.isFinite(termMonths) && termMonths <= paidCount) {
      throw new Error("INVALID_TERM");
    }

    const openRequest = await tx.loanExtension.findFirst({
      where: { loanId, status: "PENDING" },
    });
    if (openRequest) throw new Error("EXTENSION_ALREADY_PENDING");

    return tx.loanExtension.create({
      data: {
        loanId,
        requestedByUserId: userId,
        requestedTermMonths: termMonths,
        reason,
        oldTermMonths: loan.termMonths,
        oldInterestRate: loan.interestRate,
        oldOneTimeFeeCents: loan.oneTimeFeeCents,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function approveLoanExtension(
  extensionId: string,
  adminUserId: string,
  input: { termMonths: number; interestRate: number; oneTimeFeeCents: number },
) {
  return prisma.$transaction(async (tx) => {
    const extension = await tx.loanExtension.findUnique({
      where: { id: extensionId },
      include: { loan: true },
    });
    if (!extension) throw new Error("NOT_FOUND");
    if (extension.status !== "PENDING") throw new Error("EXTENSION_NOT_PENDING");
    const loan = extension.loan;

    const paidCount = await tx.loanPayment.count({
      where: { loanId: loan.id, status: "PAID" },
    });
    if (input.termMonths <= paidCount) throw new Error("INVALID_TERM");

    const now = new Date();

    await tx.loanPayment.deleteMany({
      where: { loanId: loan.id, status: "SCHEDULED" },
    });

    const { schedule, monthlyPayment } = buildLoanSchedule(
      loan.remainingAmount,
      input.interestRate,
      input.termMonths,
      input.oneTimeFeeCents,
    );
    const totalRepayment = schedule.reduce((s, p) => s + p.amount, 0);
    const totalInterest = totalRepayment - loan.remainingAmount;

    await tx.loanPayment.createMany({
      data: schedule.map((p, i) => {
        const date = new Date(now);
        date.setMonth(date.getMonth() + i + 1);
        date.setDate(0);
        return {
          loanId: loan.id,
          installmentNumber: paidCount + p.installmentNumber,
          scheduledDate: date,
          amount: p.amount,
          principalPortion: p.principalPortion,
          interestPortion: p.interestPortion,
          remainingBalance: p.remainingBalance,
          status: "SCHEDULED" as const,
        };
      }),
    });

    await tx.loan.update({
      where: { id: loan.id },
      data: {
        termMonths: input.termMonths,
        monthlyPayment,
        totalInterest: Math.max(0, totalInterest),
        totalRepayment,
        interestRate: input.interestRate,
        oneTimeFeeCents: input.oneTimeFeeCents,
        oneTimeFeePaid: false,
      },
    });

    return tx.loanExtension.update({
      where: { id: extensionId },
      data: {
        status: "APPROVED",
        reviewedByUserId: adminUserId,
        reviewedAt: now,
        newTermMonths: input.termMonths,
        newInterestRate: input.interestRate,
        newOneTimeFeeCents: input.oneTimeFeeCents,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function rejectLoanExtension(
  extensionId: string,
  adminUserId: string,
  reason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const extension = await tx.loanExtension.findUnique({
      where: { id: extensionId },
    });
    if (!extension) throw new Error("NOT_FOUND");
    if (extension.status !== "PENDING") throw new Error("EXTENSION_NOT_PENDING");

    return tx.loanExtension.update({
      where: { id: extensionId },
      data: {
        status: "REJECTED",
        reviewedByUserId: adminUserId,
        reviewedAt: new Date(),
        rejectionReason: reason ?? null,
      },
    });
  });
}
