import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseInput,
  requireAdmin,
  safeRoute
} from "@/lib/api-helpers";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { payoutUnlockedFestgeldAccount } from "@/lib/festgeld";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/security";

type Params = {
  params: Promise<{ id: string }>;
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

    const { id } = await context.params;
    const accountId = parseInput(cuidSchema, id);

    await settleCustomerAccounting();

    const account = await prisma.festgeldAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      return NextResponse.json({ error: "Festgeldkonto nicht gefunden." }, { status: 404 });
    }

    if (account.status !== "UNLOCKED") {
      return NextResponse.json({ error: "Nur entsperrte Festgeldkonten koennen ausgezahlt werden." }, { status: 400 });
    }

    const result = await payoutUnlockedFestgeldAccount(account.id);

    return NextResponse.json(result);
  });
}
