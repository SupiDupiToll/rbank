import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireAdmin,
  safeRoute
} from "@/lib/api-helpers";
import { createFestgeldAccount, settleMaturedFestgeldAccounts } from "@/lib/festgeld";
import { rateLimitPolicies } from "@/lib/rate-limit";
import {
  amountCentsSchema,
  customerIdSchema,
  isoDateStringSchema,
  MAX_LABEL_LENGTH,
  safeTextSchema
} from "@/lib/security";

export async function POST(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    const body = await parseJsonBody(
      request,
      z
        .object({
          customerId: customerIdSchema,
          label: safeTextSchema(MAX_LABEL_LENGTH),
          amount: amountCentsSchema,
          interestRate: z.number().min(0).max(100),
          startDate: isoDateStringSchema,
          endDate: isoDateStringSchema
        })
        .refine((value) => value.endDate > value.startDate, {
          message: "Enddatum muss nach dem Startdatum liegen.",
          path: ["endDate"]
        })
    );

    const accountHolder = await prisma.user.findUnique({
      where: { customerId: body.customerId },
      select: { id: true, role: true }
    });

    if (!accountHolder || accountHolder.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Ungueltige Daten." }, { status: 400 });
    }

    try {
      const { account } = await createFestgeldAccount({
        userId: accountHolder.id,
        label: body.label,
        amount: body.amount,
        interestRate: body.interestRate,
        startDate: body.startDate,
        endDate: body.endDate
      });

      return NextResponse.json({ account }, { status: 201 });
    } catch (creationError) {
      if (creationError instanceof Error && creationError.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json({ error: "Nicht genuegend Guthaben fuer die Festgeldanlage." }, { status: 400 });
      }

      throw creationError;
    }
  });
}

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    await settleMaturedFestgeldAccounts();

    const accounts = await prisma.festgeldAccount.findMany({
      orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: { stackUserId: true, customerId: true, displayName: true }
        }
      }
    });

    return NextResponse.json({ accounts });
  });
}
