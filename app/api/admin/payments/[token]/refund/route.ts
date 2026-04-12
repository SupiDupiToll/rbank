import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseInput,
  requireAdmin,
  safeRoute,
} from "@/lib/api-helpers";
import { refundCompletedPayment } from "@/lib/payment-gateway";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { paymentTokenSchema } from "@/lib/security";

type Params = {
  params: Promise<{ token: string }>;
};

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

    const { token } = await context.params;
    const parsedToken = parseInput(paymentTokenSchema, token);

    try {
      const session = await refundCompletedPayment(parsedToken);
      return NextResponse.json({ success: true, session });
    } catch (error) {
      if (error instanceof Error && error.message === "REFUND_NOT_ALLOWED") {
        return NextResponse.json({ error: "Rueckerstattung ist fuer diese Zahlung nicht moeglich." }, { status: 400 });
      }

      throw error;
    }
  });
}
