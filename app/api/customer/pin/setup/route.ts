import { z } from "zod";
import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireCustomer,
  safeRoute
} from "@/lib/api-helpers";
import { hashPin } from "@/lib/pin";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { pinSchema } from "@/lib/security";

export async function POST(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    const body = await parseJsonBody(
      request,
      z.object({
        pin: pinSchema,
        confirmationPin: pinSchema
      })
    );

    if (body.pin !== body.confirmationPin) {
      return NextResponse.json({ error: "Die PINs stimmen nicht ueberein." }, { status: 400 });
    }

    if (user.pinHash) {
      return NextResponse.json({ error: "PIN ist bereits eingerichtet." }, { status: 409 });
    }

    const pinHash = await hashPin(body.pin);

    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash }
    });

    return NextResponse.json({ success: true });
  });
}
