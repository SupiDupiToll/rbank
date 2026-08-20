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
import { buildWalletPassForUser, createWalletPassForUser } from "@/lib/wallet/service";

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
    await createWalletPassForUser(user.id);
    const { buffer, unsigned } = await buildWalletPassForUser(user.id);

    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="family-card.pkpass"',
        "Cache-Control": "no-store",
      },
    });
    if (unsigned) {
      response.headers.set("X-Pass-Unsigned", "1");
    }
    return response;
  });
}
