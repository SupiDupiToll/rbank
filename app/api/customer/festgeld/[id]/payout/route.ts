import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseInput,
  requireCustomerWithPin,
  safeRoute,
} from "@/lib/api-helpers";
import {
  payoutUnlockedFestgeldAccount,
  settleMaturedFestgeldAccounts,
} from "@/lib/festgeld";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/security";
import {
  buildIncomingTransactionNotification,
  sendToUser,
} from "@/lib/push-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomerWithPin();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.customerApi,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    const { id } = await context.params;
    const accountId = parseInput(cuidSchema, id);

    await settleMaturedFestgeldAccounts(user.id);

    const account = await prisma.festgeldAccount.findFirst({
      where: { id: accountId, userId: user.id },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Festgeldkonto nicht gefunden." },
        { status: 404 },
      );
    }

    if (account.status !== "UNLOCKED") {
      return NextResponse.json(
        { error: "Nur entsperrte Festgeldkonten koennen ausgezahlt werden." },
        { status: 400 },
      );
    }

    const result = await payoutUnlockedFestgeldAccount(account.id);

    // Send push notification for the payout transaction (fire-and-forget)
    if (result.payoutTransaction) {
      sendToUser(
        user.id,
        buildIncomingTransactionNotification(result.payoutTransaction.amount),
      ).catch(console.error);
    }

    return NextResponse.json(result);
  });
}
