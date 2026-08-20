import { z } from "zod";
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
import { cuidSchema } from "@/lib/security";
import { refreshWalletPassForUser } from "@/lib/wallet/service";
import { invalidateGlobalData, invalidateUserData } from "@/lib/cache";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.adminApi,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    const { id } = await context.params;
    const userId = cuidSchema.parse(id);

    const body = await parseJsonBody(
      request,
      z.object({ blocked: z.boolean() }),
    );

    const accountHolder = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!accountHolder || accountHolder.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Ungueltige Daten." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: body.blocked },
    });

    await refreshWalletPassForUser(userId, true);
    invalidateUserData(userId);
    invalidateGlobalData();

    return NextResponse.json({ blocked: body.blocked });
  });
}
