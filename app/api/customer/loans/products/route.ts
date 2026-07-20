import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, requireCustomer, safeRoute } from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    const products = await prisma.loanProduct.findMany({
      where: { isActive: true },
      orderBy: { interestRate: "asc" },
    });

    return NextResponse.json({ products });
  });
}
