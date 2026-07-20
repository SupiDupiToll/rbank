import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseInput,
  requireCustomerWithPin,
  safeRoute,
} from "@/lib/api-helpers";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { makePayment } from "@/lib/loan";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/security";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomerWithPin();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { id } = await context.params;
    const loanId = parseInput(cuidSchema, id);

    await settleCustomerAccounting(user.id);

    const loan = await prisma.loan.findFirst({
      where: { id: loanId, userId: user.id },
    });

    if (!loan) {
      return NextResponse.json({ error: "Kredit nicht gefunden." }, { status: 404 });
    }

    try {
      const result = await makePayment(loanId, user.id);
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "INSUFFICIENT_BALANCE") {
          return NextResponse.json({ error: "Nicht genug Guthaben." }, { status: 400 });
        }
        if (err.message === "LOAN_NOT_ACTIVE") {
          return NextResponse.json({ error: "Kredit ist nicht aktiv." }, { status: 400 });
        }
        if (err.message === "NO_PAYMENT_DUE") {
          return NextResponse.json({ error: "Keine faellige Rate." }, { status: 400 });
        }
      }
      throw err;
    }
  });
}
