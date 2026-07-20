import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, requireAdmin, safeRoute } from "@/lib/api-helpers";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { rateLimitPolicies } from "@/lib/rate-limit";

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    await settleCustomerAccounting();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const where = statusFilter ? { status: statusFilter as any } : {};

    const loans = await prisma.loan.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        user: {
          select: { customerId: true, displayName: true, stackUserId: true },
        },
        loanProduct: { select: { name: true } },
        _count: {
          select: {
            payments: { where: { status: "SCHEDULED" } },
          },
        },
      },
    });

    return NextResponse.json({ loans });
  });
}
