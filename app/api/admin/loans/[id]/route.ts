import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceRateLimit,
  parseInput,
  requireAdmin,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { id } = await context.params;
    const loanId = parseInput(cuidSchema, id);

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: { select: { customerId: true, displayName: true } },
        loanProduct: { select: { name: true } },
        payments: { orderBy: { installmentNumber: "asc" } },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: "Kredit nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ loan });
  });
}
