import { notFound } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout-flow";
import { getCheckoutUserSummary, getPaymentSessionByToken, serializePaymentSession } from "@/lib/payment-gateway";
import { getCheckoutCookieUserId } from "@/lib/payments";
import { paymentTokenSchema } from "@/lib/security";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PayPage({ params }: Props) {
  const { token } = await params;
  const parsedToken = paymentTokenSchema.safeParse(token);
  if (!parsedToken.success) {
    notFound();
  }

  const session = await getPaymentSessionByToken(parsedToken.data);
  if (!session) {
    notFound();
  }

  const checkoutUserId = await getCheckoutCookieUserId(parsedToken.data);
  const checkoutUser = checkoutUserId
    ? await getCheckoutUserSummary(checkoutUserId)
    : null;

  return (
    <CheckoutFlow
      initialSession={serializePaymentSession(session)}
      checkoutUser={checkoutUser}
    />
  );
}
