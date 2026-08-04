import { notFound } from "next/navigation";
import { EmbeddedCheckoutFlow } from "@/components/embedded-checkout-flow";
import {
  getEmbeddedCheckoutUsers,
  getPaymentSessionByToken,
  serializePaymentSession,
} from "@/lib/payment-gateway";
import { isValidEmbedCheckoutKey } from "@/lib/payments";
import { paymentTokenSchema } from "@/lib/security";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ key?: string }>;
};

export default async function EmbeddedPayPage({ params, searchParams }: Props) {
  const [{ token }, { key }] = await Promise.all([params, searchParams]);
  const embedKey = key ?? "";
  const parsedToken = paymentTokenSchema.safeParse(token);
  if (!parsedToken.success || !isValidEmbedCheckoutKey(embedKey)) {
    notFound();
  }

  const [session, availableUsers] = await Promise.all([
    getPaymentSessionByToken(parsedToken.data),
    getEmbeddedCheckoutUsers(),
  ]);

  if (!session) {
    notFound();
  }

  return (
    <EmbeddedCheckoutFlow
      availableUsers={availableUsers}
      embedKey={embedKey}
      initialSession={serializePaymentSession(session)}
    />
  );
}
