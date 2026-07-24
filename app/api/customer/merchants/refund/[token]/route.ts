import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseInput,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { refundCompletedPayment } from "@/lib/payment-gateway";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { paymentTokenSchema } from "@/lib/security";

type Params = {
  params: Promise<{ token: string }>;
};

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

    const { token } = await context.params;
    const parsedToken = parseInput(paymentTokenSchema, token);

    const session = await prisma.paymentSession.findUnique({
      where: { token: parsedToken },
      include: {
        merchant: {
          select: { userId: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Zahlung nicht gefunden." },
        { status: 404 },
      );
    }

    if (session.merchant.userId !== user.id) {
      return NextResponse.json(
        { error: "Zugriff verweigert." },
        { status: 403 },
      );
    }

    if (session.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Rueckerstattung ist fuer diese Zahlung nicht moeglich." },
        { status: 400 },
      );
    }

    try {
      const result = await refundCompletedPayment(parsedToken);
      return NextResponse.json({ success: true, session: result });
    } catch (error) {
      if (error instanceof Error && error.message === "REFUND_NOT_ALLOWED") {
        return NextResponse.json(
          { error: "Rueckerstattung ist fuer diese Zahlung nicht moeglich." },
          { status: 400 },
        );
      }

      throw error;
    }
  });
}
