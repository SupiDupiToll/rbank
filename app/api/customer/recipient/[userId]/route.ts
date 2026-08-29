import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceRateLimit,
  jsonError,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/security";

type Params = {
  params: Promise<{ userId: string }>;
};

export async function GET(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.customerApi,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    const { userId } = await context.params;
    const parsedUserId = cuidSchema.safeParse(userId);

    if (!parsedUserId.success) {
      return jsonError("Empfänger wurde nicht gefunden.", 404);
    }

    if (parsedUserId.data === user.id) {
      return jsonError("Das ist dein eigener Code.", 400);
    }

    const recipient = await prisma.user.findUnique({
      where: { id: parsedUserId.data },
      select: { customerId: true, displayName: true, role: true },
    });

    if (!recipient || recipient.role !== "CUSTOMER") {
      return jsonError("Empfänger wurde nicht gefunden.", 404);
    }

    return NextResponse.json({
      customerId: recipient.customerId,
      displayName: recipient.displayName ?? `Kunde ${recipient.customerId}`,
    });
  });
}
