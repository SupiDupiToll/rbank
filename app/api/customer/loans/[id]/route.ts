import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceRateLimit,
  parseInput,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { id } = await context.params;
    const loanId = parseInput(cuidSchema, id);

    await settleCustomerAccounting(user.id);

    const loan = await prisma.loan.findFirst({
      where: { id: loanId, userId: user.id },
      include: {
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
