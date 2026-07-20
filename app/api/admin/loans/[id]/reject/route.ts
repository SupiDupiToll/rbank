import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseInput,
  requireAdmin,
  safeRoute,
} from "@/lib/api-helpers";
import { rejectLoan } from "@/lib/loan";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { id } = await context.params;
    const loanId = parseInput(cuidSchema, id);

    try {
      const loan = await rejectLoan(loanId);
      return NextResponse.json({ loan });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "LOAN_NOT_FOUND") {
          return NextResponse.json({ error: "Kredit nicht gefunden." }, { status: 404 });
        }
        if (err.message === "LOAN_NOT_PENDING") {
          return NextResponse.json({ error: "Kredit ist nicht im PENDING-Status." }, { status: 400 });
        }
      }
      throw err;
    }
  });
}
