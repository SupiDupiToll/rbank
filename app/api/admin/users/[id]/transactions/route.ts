import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, parseInput, requireAdmin, safeRoute } from "@/lib/api-helpers";
import { settleMaturedFestgeldAccounts } from "@/lib/festgeld";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { customerIdSchema } from "@/lib/security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { id } = await context.params;
    const customerId = parseInput(customerIdSchema, id);

    const accountHolder = await prisma.user.findUnique({
      where: { customerId },
      select: { id: true, role: true }
    });

    if (!accountHolder || accountHolder.role !== "CUSTOMER") {
      return NextResponse.json({ transactions: [] });
    }

    await settleMaturedFestgeldAccounts(accountHolder.id);

    const transactions = await prisma.transaction.findMany({
      where: { userId: accountHolder.id },
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
    });

    return NextResponse.json({ transactions });
  });
}
