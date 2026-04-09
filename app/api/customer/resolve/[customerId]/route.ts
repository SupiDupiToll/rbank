import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, parseInput, requireCustomer, safeRoute } from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { customerIdSchema } from "@/lib/security";

type Params = {
  params: Promise<{ customerId: string }>;
};

export async function GET(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { customerId } = await context.params;
    const parsedCustomerId = parseInput(customerIdSchema, customerId);

    if (parsedCustomerId === user.customerId) {
      return NextResponse.json({ error: "Das ist Ihre eigene Kundennummer." }, { status: 400 });
    }

    const recipient = await prisma.user.findUnique({
      where: { customerId: parsedCustomerId },
      select: { customerId: true, displayName: true, role: true }
    });

    if (!recipient || recipient.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Empfaenger wurde nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({
      customerId: recipient.customerId,
      displayName: recipient.displayName ?? `Kunde ${recipient.customerId}`
    });
  });
}
