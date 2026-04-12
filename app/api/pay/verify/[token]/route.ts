import { NextResponse } from "next/server";
import { getPaymentSessionByToken } from "@/lib/payment-gateway";
import { authenticateMerchantRequest, getPaymentStatus } from "@/lib/payments";
import { paymentTokenSchema } from "@/lib/security";

type Params = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, context: Params) {
  const { merchant, error } = await authenticateMerchantRequest(request);
  if (error || !merchant) {
    return error;
  }

  const { token } = await context.params;
  const parsedToken = paymentTokenSchema.safeParse(token);
  if (!parsedToken.success) {
    return NextResponse.json({ error: "Ungueltiger Token." }, { status: 400 });
  }

  const session = await getPaymentSessionByToken(parsedToken.data);
  if (!session || session.merchantDbId !== merchant.id) {
    return NextResponse.json({ error: "Zahlung nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({
    status: getPaymentStatus(session),
    amount: session.amount,
    currency: session.currency,
    paidAt: session.paidAt?.toISOString() ?? null,
    customerId: session.user?.customerId ?? null,
    metadata: session.metadataJson ?? {},
  });
}
