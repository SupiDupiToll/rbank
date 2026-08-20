import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { revokeWalletPassForUser } from "@/lib/wallet/service";

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

    const revoked = await revokeWalletPassForUser(user.id);

    if (!revoked) {
      return NextResponse.json(
        { error: "Kein aktiver Family Card Pass vorhanden." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      status: "REVOKED",
      revokedAt: revoked.revokedAt?.toISOString() ?? null,
    });
  });
}
