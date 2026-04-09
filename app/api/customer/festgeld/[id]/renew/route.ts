import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseInput,
  requireCustomer,
  safeRoute
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getFestgeldDurationDays, settleMaturedFestgeldAccounts } from "@/lib/festgeld";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/security";

type Params = {
  params: Promise<{ id: string }>;
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

    const { id } = await context.params;
    const accountId = parseInput(cuidSchema, id);

    await settleMaturedFestgeldAccounts(user.id);

    const account = await prisma.festgeldAccount.findFirst({
      where: { id: accountId, userId: user.id }
    });

    if (!account) {
      return NextResponse.json({ error: "Festgeldkonto nicht gefunden." }, { status: 404 });
    }

    if (account.status !== "UNLOCKED") {
      return NextResponse.json({ error: "Nur entsperrte Festgeldkonten koennen verlaengert werden." }, { status: 400 });
    }

    const durationDays = getFestgeldDurationDays(account.startDate, account.endDate);
    const nextStartDate = new Date();
    const nextEndDate = new Date(nextStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const renewedAccount = await prisma.festgeldAccount.update({
      where: { id: account.id },
      data: {
        startDate: nextStartDate,
        endDate: nextEndDate,
        status: "ACTIVE",
        interestCreditedAt: null,
        payoutDate: null,
        payoutTransactionId: null
      }
    });

    return NextResponse.json({ account: renewedAccount });
  });
}
