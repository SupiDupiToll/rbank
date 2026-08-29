import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceRateLimit,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { MAX_SEARCH_RESULTS } from "@/lib/security";

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.customerApi,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim();

    if (query.length < 2) {
      return NextResponse.json({ customers: [] });
    }

    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        id: { not: user.id },
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { customerId: { contains: query } },
        ],
      },
      select: {
        customerId: true,
        displayName: true,
      },
      orderBy: [{ displayName: "asc" }],
      take: MAX_SEARCH_RESULTS,
    });

    return NextResponse.json({
      customers: customers.map((customer) => ({
        customerId: customer.customerId,
        displayName:
          customer.displayName ?? `Kunde ${customer.customerId}`,
      })),
    });
  });
}
