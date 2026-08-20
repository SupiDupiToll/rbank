import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import {
  getWalletPassRecord,
  getWalletPassStatusForUser,
} from "@/lib/wallet/service";

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.customerApi,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    const [status, pass] = await Promise.all([
      getWalletPassStatusForUser(user.id),
      getWalletPassRecord(user.id),
    ]);

    return NextResponse.json({
      status,
      exists: status !== "NONE",
      pass: pass
        ? {
            serialNumber: pass.serialNumber,
            passTypeIdentifier: pass.passTypeIdentifier,
            cardLastFour: pass.cardLastFour,
            status: pass.status,
            createdAt: pass.createdAt.toISOString(),
            updatedAt: pass.updatedAt.toISOString(),
            revokedAt: pass.revokedAt?.toISOString() ?? null,
            lastPushUpdate: pass.lastPushUpdate?.toISOString() ?? null,
          }
        : null,
    });
  });
}
