import { NextResponse } from "next/server";
import { cancelPaymentSession, getPaymentSessionByToken } from "@/lib/payment-gateway";
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

  await cancelPaymentSession(parsedToken.data);
  return NextResponse.json({ success: true, redirectUrl: session.cancelUrl });
}
