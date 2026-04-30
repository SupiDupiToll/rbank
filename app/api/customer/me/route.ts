import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, requireCustomer, safeRoute } from "@/lib/api-helpers";
import { getBalancesByCurrency } from "@/lib/banking";
import { settleMaturedFestgeldAccounts } from "@/lib/festgeld";
import { rateLimitPolicies } from "@/lib/rate-limit";

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    await settleMaturedFestgeldAccounts(user.id);

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
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
    });

    const { eurBalanceCents, airBalance } = getBalancesByCurrency(transactions);

    return NextResponse.json({
      balanceCents: eurBalanceCents,
      airBalance,
      customerId: user.customerId,
      displayName: user.displayName,
      transactions
    });
  });
}
