import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { settleOverdraftInterest } from "@/lib/overdraft";

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

  for (let i = 1; i <= termMonths; i++) {
    const interestPortion = Math.round(remaining * monthlyRate);
    let principalPortion = monthlyPayment - interestPortion;
    const isLast = i === termMonths;
    if (isLast) {
      principalPortion = remaining;
    } else if (principalPortion > remaining) {
      principalPortion = remaining;
    }
    const paymentAmount = principalPortion + interestPortion;
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

export async function approveLoan(loanId: string, adminUserId: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: { loanProduct: true },
    });

    if (!loan) throw new Error("LOAN_NOT_FOUND");
    if (loan.status !== "PENDING") throw new Error("LOAN_NOT_PENDING");

    const { schedule, monthlyPayment } = generateAmortizationSchedule(
      loan.amount,
      loan.interestRate,
      loan.termMonths,
    );

    const totalRepayment = schedule.reduce((sum, p) => sum + p.amount, 0);
    const totalInterest = totalRepayment - loan.amount;

    const now = new Date();

    const disbursementTx = await tx.transaction.create({
      data: {
        userId: loan.userId,
        type: "INCOMING",
        amount: loan.amount,
        currency: "EUR",
        description: `Kreditauszahlung · ${loan.purpose ?? loan.loanProduct?.name ?? "Kredit"} (${loan.termMonths} Monate, ${loan.interestRate.toFixed(2)}%)`,
        source: "LOAN_DISBURSEMENT",
        date: now,
      },
    });

    const scheduledDates = schedule.map((_, i) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() + i + 1);
      date.setDate(1);
      if (date.getMonth() > now.getMonth() + i + 1) {
        date.setDate(0);
      }
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

export async function makePayment(loanId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== userId) throw new Error("LOAN_NOT_FOUND");
    if (loan.status !== "ACTIVE") throw new Error("LOAN_NOT_ACTIVE");

    const nextPayment = await tx.loanPayment.findFirst({
      where: { loanId, status: "SCHEDULED" },
      orderBy: { installmentNumber: "asc" },
    });

    if (!nextPayment) throw new Error("NO_PAYMENT_DUE");

    const balance = await getUserBalanceCentsTx(tx, userId);

    if (balance < nextPayment.amount) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    const now = new Date();
    const paymentTx = await tx.transaction.create({
      data: {
        userId,
        type: "OUTGOING",
        amount: nextPayment.amount,
        currency: "EUR",
        description: `Kreditrate ${nextPayment.installmentNumber}/${loan.termMonths}`,
        source: "LOAN_REPAYMENT",
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
    const totalPayoffAmount = loan.remainingAmount + currentInterest;

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
        source: "LOAN_REPAYMENT",
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
      },
    });

    return { transaction: payoffTx, totalPayoffAmount };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function deferPayment(loanId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== userId) throw new Error("LOAN_NOT_FOUND");
    if (loan.status !== "ACTIVE") throw new Error("LOAN_NOT_ACTIVE");

    const nextPayment = await tx.loanPayment.findFirst({
      where: { loanId, status: "SCHEDULED" },
      orderBy: { installmentNumber: "asc" },
    });

    if (!nextPayment) throw new Error("NO_PAYMENT_TO_DEFER");

    await tx.loanPayment.update({
      where: { id: nextPayment.id },
      data: { status: "SKIPPED" },
    });

    const remainingPayments = await tx.loanPayment.findMany({
      where: { loanId, status: "SCHEDULED" },
      orderBy: { installmentNumber: "asc" },
    });

    const lastInstallment = remainingPayments.length > 0
      ? remainingPayments[remainingPayments.length - 1].installmentNumber
      : nextPayment.installmentNumber;

    for (const payment of remainingPayments) {
      const newDate = new Date(payment.scheduledDate);
      newDate.setMonth(newDate.getMonth() + 1);
      await tx.loanPayment.update({
        where: { id: payment.id },
        data: { scheduledDate: newDate },
      });
    }

    await tx.loan.update({
      where: { id: loanId },
      data: { termMonths: loan.termMonths + 1 },
    });

    return { skippedPayment: nextPayment };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function processDuePayments(userId?: string) {
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
      const result = await makePayment(payment.loanId, payment.loan.userId);
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
