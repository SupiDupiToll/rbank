import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseInput,
  requireAdmin,
  safeRoute
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { settleMaturedFestgeldAccounts } from "@/lib/festgeld";
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

    await settleMaturedFestgeldAccounts();

    const account = await prisma.festgeldAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      return NextResponse.json({ error: "Festgeldkonto nicht gefunden." }, { status: 404 });
    }

    if (account.status !== "UNLOCKED") {
      return NextResponse.json({ error: "Nur entsperrte Festgeldkonten koennen ausgezahlt werden." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payoutTransaction = await tx.transaction.create({
        data: {
          userId: account.userId,
          type: "INCOMING",
          amount: account.amount,
          description: `Festgeldauszahlung ${account.label}`,
          source: "ADMIN",
          date: new Date()
        }
      });

      const updatedAccount = await tx.festgeldAccount.update({
        where: { id: account.id },
        data: {
          status: "PAID_OUT",
          payoutDate: new Date(),
          payoutTransactionId: payoutTransaction.id
        }
      });

      return { payoutTransaction, updatedAccount };
    });

    return NextResponse.json(result);
  });
}
