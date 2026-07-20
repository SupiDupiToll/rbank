import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, requireCustomer, safeRoute } from "@/lib/api-helpers";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { rateLimitPolicies } from "@/lib/rate-limit";

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    await settleCustomerAccounting(user.id);

    const loans = await prisma.loan.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        loanProduct: { select: { name: true } },
        payments: {
          where: { status: "SCHEDULED" },
          orderBy: { installmentNumber: "asc" },
          take: 1,
        },
      },
    });

    const enriched = loans.map((loan) => ({
      ...loan,
      nextPayment: loan.payments[0] ?? null,
    }));

    return NextResponse.json({ loans: enriched });
  });
}
