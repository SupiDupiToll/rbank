import { notFound, redirect } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout-flow";
import { getCurrentAppUser } from "@/lib/current-user";
import { getCheckoutUserSummary, getPaymentSessionByToken, serializePaymentSession } from "@/lib/payment-gateway";
import { paymentTokenSchema } from "@/lib/security";
import { stackServerApp } from "@/stack/server";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PayPage({ params }: Props) {
  const { token } = await params;
  const parsedToken = paymentTokenSchema.safeParse(token);
  if (!parsedToken.success) {
    notFound();
  }

  const [session, user, stackUser] = await Promise.all([
    getPaymentSessionByToken(parsedToken.data),
    getCurrentAppUser(),
    stackServerApp.getUser(),
  ]);
  if (!session) {
    notFound();
  }

  if (!user || !stackUser) {
    redirect(`/login?redirect=${encodeURIComponent(`/pay/${parsedToken.data}`)}`);
  }

  const checkoutUser = await getCheckoutUserSummary(user.id);

  return (
    <CheckoutFlow
      initialSession={serializePaymentSession(session)}
      checkoutUser={checkoutUser}
    />
  );
}
