import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, requireAdmin, safeRoute } from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const extensions = await prisma.loanExtension.findMany({
      where: status ? { status: status as never } : {},
      orderBy: [{ createdAt: "desc" }],
      include: {
        loan: {
          select: {
            id: true,
            amount: true,
            interestRate: true,
            remainingAmount: true,
            oneTimeFeeCents: true,
            termMonths: true,
            monthlyPayment: true,
            payments: {
              where: { status: "PAID" },
              select: { id: true },
            },
            user: {
              select: { customerId: true, displayName: true, stackUserId: true },
            },
          },
        },
      },
    });

    const payload = extensions.map((ext) => ({
      id: ext.id,
      status: ext.status,
      reason: ext.reason,
      requestedTermMonths: ext.requestedTermMonths,
      oldTermMonths: ext.oldTermMonths,
      oldInterestRate: ext.oldInterestRate,
      oldOneTimeFeeCents: ext.oldOneTimeFeeCents,
      newTermMonths: ext.newTermMonths,
      newInterestRate: ext.newInterestRate,
      newOneTimeFeeCents: ext.newOneTimeFeeCents,
      reviewedAt: ext.reviewedAt,
      createdAt: ext.createdAt,
      loan: {
        id: ext.loan.id,
        amount: ext.loan.amount,
        interestRate: ext.loan.interestRate,
        remainingAmount: ext.loan.remainingAmount,
        oneTimeFeeCents: ext.loan.oneTimeFeeCents,
        termMonths: ext.loan.termMonths,
        monthlyPayment: ext.loan.monthlyPayment,
        paidInstallments: ext.loan.payments.length,
        user: ext.loan.user,
      },
    }));

    return NextResponse.json({ extensions: payload });
  });
}
