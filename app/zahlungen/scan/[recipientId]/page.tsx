import { notFound } from "next/navigation";
import { PinSetupGate } from "@/components/pin-setup-gate";
import { PaymentRequestFlow } from "@/components/payment-request-flow";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { cuidSchema } from "@/lib/security";
import { stackServerApp } from "@/stack/server";

type ScanPaymentPageProps = {
  params: Promise<{ recipientId: string }>;
};

export default async function ScanPaymentPage({
  params,
}: ScanPaymentPageProps) {
  const [{ recipientId }, user, stackUser] = await Promise.all([
    params,
    getCurrentAppUser(),
    stackServerApp.getUser(),
  ]);

  if (!user || !stackUser) {
    notFound();
  }

  const parsedRecipientId = cuidSchema.safeParse(recipientId);

  if (!parsedRecipientId.success) {
    notFound();
  }

  if (parsedRecipientId.data === user.id) {
    notFound();
  }

  const recipient = await prisma.user.findUnique({
    where: { id: parsedRecipientId.data },
    select: { id: true, role: true, displayName: true, customerId: true },
  });

  if (!recipient || recipient.role !== "CUSTOMER") {
    notFound();
  }

  const recipientEmail =
    recipient.displayName ?? `Kunde ${recipient.customerId}`;

  return (
    <PinSetupGate hasPin={Boolean(user.paymentPinHash)}>
      <div className="min-h-screen px-4 py-8 text-on-surface">
        <div className="mx-auto max-w-5xl">
          <PaymentRequestFlow
            recipientUserId={recipient.id}
            recipientEmail={recipientEmail}
            returnUrl="/dashboard"
          />
        </div>
      </div>
    </PinSetupGate>
  );
}
