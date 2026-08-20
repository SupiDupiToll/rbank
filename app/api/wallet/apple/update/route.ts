import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { refreshWalletPassForUser } from "@/lib/wallet/service";

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

    await settleCustomerAccounting(user.id);
    const pushed = await refreshWalletPassForUser(user.id, true);

    return NextResponse.json({
      success: true,
      pushedDevices: pushed,
      updatedAt: new Date().toISOString(),
    });
  });
}
