import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseInput,
  parseJsonBody,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { safeTextSchema } from "@/lib/security";
import { requestLoanExtension } from "@/lib/loan";
import { invalidateUserData } from "@/lib/cache";
import { settleCustomerAccounting } from "@/lib/customer-accounting";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { id: loanId } = await context.params;
    const body = await parseJsonBody(
      request,
      z.object({
        termMonths: z.number().int().min(1).max(600),
        reason: safeTextSchema(200).optional(),
      }),
    );

    await settleCustomerAccounting(user.id);
    const loan = await prisma.loan.findFirst({
      where: { id: loanId, userId: user.id },
      select: { id: true },
    });
    if (!loan) {
      return NextResponse.json({ error: "Kredit nicht gefunden." }, { status: 404 });
    }

    try {
      const extension = await requestLoanExtension(loan.id, user.id, body.termMonths, body.reason);
      invalidateUserData(user.id);
      return NextResponse.json({ extension });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "LOAN_NOT_ACTIVE") {
          return NextResponse.json({ error: "Kredit ist nicht aktiv." }, { status: 400 });
        }
        if (err.message === "EXTENSION_ALREADY_PENDING") {
          return NextResponse.json({ error: "Es existiert bereits ein offener Verlängerungsantrag." }, { status: 400 });
        }
        if (err.message === "INVALID_TERM") {
          return NextResponse.json({ error: "Die Laufzeit muss größer als die bereits bezahlten Raten sein." }, { status: 400 });
        }
      }
      throw err;
    }
  });
}

export async function GET(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { id } = await context.params;
    const loanId = parseInput(z.string(), id);

    const extensions = await prisma.loanExtension.findMany({
      where: { loanId, loan: { userId: user.id } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ extensions });
  });
}
