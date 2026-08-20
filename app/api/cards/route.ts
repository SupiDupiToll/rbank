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

    const card = await prisma.card.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        status: true,
        email: true,
        phoneNumber: true,
        cardLastFour: true,
        balanceCents: true,
        activatedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ card: card ?? null });
  });
}