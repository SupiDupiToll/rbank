import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireAdmin,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { rejectLoanExtension } from "@/lib/loan";
import { invalidateGlobalData, invalidateUserData } from "@/lib/cache";
import { z } from "zod";

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

    const { id: extensionId } = await context.params;

    const body = await parseJsonBody(
      request,
      z.object({ reason: z.string().max(500).optional() }),
    );

    const extensionRecord = await prisma.loanExtension.findUnique({
      where: { id: extensionId },
      select: { loan: { select: { userId: true } } },
    });

    try {
      const result = await rejectLoanExtension(extensionId, user.id, body.reason);
      if (extensionRecord) {
        invalidateUserData(extensionRecord.loan.userId);
      }
      invalidateGlobalData();
      return NextResponse.json({ extension: result });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") {
          return NextResponse.json({ error: "Antrag nicht gefunden." }, { status: 404 });
        }
        if (err.message === "EXTENSION_NOT_PENDING") {
          return NextResponse.json({ error: "Antrag ist nicht mehr ausstehend." }, { status: 400 });
        }
      }
      throw err;
    }
  });
}
