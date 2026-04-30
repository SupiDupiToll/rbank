import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, requireAdmin, safeRoute } from "@/lib/api-helpers";
import { calculateBalanceCents } from "@/lib/banking";
import { settleMaturedFestgeldAccounts } from "@/lib/festgeld";
import { rateLimitPolicies } from "@/lib/rate-limit";

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    await settleMaturedFestgeldAccounts();

    const users = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "asc" },
      select: {
        customerId: true,
        displayName: true,
        stackUserId: true,
        transactions: { select: { type: true, amount: true, currency: true } }
      }
    });

    return NextResponse.json({
      users: users.map((customer) => ({
        customerId: customer.customerId,
        displayName: customer.displayName,
        stackUserId: customer.stackUserId,
        balanceCents: calculateBalanceCents(customer.transactions, "EUR"),
        airBalance: calculateBalanceCents(customer.transactions, "AIR")
      }))
    });
  });
}
