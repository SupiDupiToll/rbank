import { NextResponse } from "next/server";
import {
  completeCheckoutPayment,
  getPaymentSessionByToken,
} from "@/lib/payment-gateway";
import { getCheckoutCookieUserId, getPaymentStatus } from "@/lib/payments";
import { paymentTokenSchema } from "@/lib/security";

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(_request: Request, context: Params) {
  const { token } = await context.params;
  const parsedToken = paymentTokenSchema.safeParse(token);
  if (!parsedToken.success) {
    return NextResponse.json({ error: "Ungueltiger Token." }, { status: 400 });
  }

  const session = await getPaymentSessionByToken(parsedToken.data);
  if (!session) {
    return NextResponse.json({ error: "Zahlung nicht gefunden." }, { status: 404 });
  }

  const status = getPaymentStatus(session);
  if (status !== "PENDING") {
    return NextResponse.json({ error: "Zahlung ist nicht mehr verfuegbar.", status }, { status: 409 });
  }

  const userId = await getCheckoutCookieUserId(parsedToken.data);
  if (!userId) {
    return NextResponse.json({ error: "Checkout-Anmeldung fehlt." }, { status: 401 });
  }

  try {
    const result = await completeCheckoutPayment(parsedToken.data, userId);
    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      redirectUrl: `${result.session.redirectUrl}${result.session.redirectUrl.includes("?") ? "&" : "?"}token=${result.session.token}&status=success`,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json({ error: "Nicht genug Guthaben." }, { status: 409 });
      }

      if (error.message === "SELF_DONATION_NOT_ALLOWED") {
        return NextResponse.json(
          { error: "Eigene Spendenboxen koennen nicht selbst bezahlt werden." },
          { status: 409 },
        );
      }

      if (["EXPIRED", "COMPLETED", "CANCELLED", "REFUNDED"].includes(error.message)) {
        return NextResponse.json({ error: "Zahlung ist nicht mehr verfuegbar.", status: error.message }, { status: 409 });
      }
    }

    throw error;
  }
}
