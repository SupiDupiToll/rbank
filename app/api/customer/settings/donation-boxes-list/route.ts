import { z } from "zod";
import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";

export async function POST(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
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

    const body = await parseJsonBody(
      request,
      z.object({
        enabled: z.boolean(),
      }),
    );

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { showDonationBoxesList: body.enabled },
      select: { showDonationBoxesList: true },
    });

    return NextResponse.json({
      enabled: updatedUser.showDonationBoxesList,
    });
  });
}
