import { notFound, redirect } from "next/navigation";
import { PinSetupGate } from "@/components/pin-setup-gate";
import { PaymentRequestFlow } from "@/components/payment-request-flow";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { cuidSchema } from "@/lib/security";
import { stackServerApp } from "@/stack/server";

type PaymentPageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ return_url?: string }>;
};

export default async function PaymentPage({
  params,
  searchParams,
}: PaymentPageProps) {
  const [{ userId }, user, stackUser, searchParamsResolved] = await Promise.all(
    [params, getCurrentAppUser(), stackServerApp.getUser(), searchParams],
  );

  if (!user || !stackUser) {
    redirect(`/login?redirect=${encodeURIComponent(`/zahlungen/${userId}`)}`);
  }

  if (user.role !== "CUSTOMER") {
    redirect("/admin");
  }

  const parsedUserId = cuidSchema.safeParse(userId);

  if (!parsedUserId.success) {
    notFound();
  }

  const payer = await prisma.user.findUnique({
    where: { id: parsedUserId.data },
    select: { id: true, role: true },
  });

  if (!payer || payer.role !== "CUSTOMER") {
    notFound();
  }

  const recipientEmail =
    stackUser.primaryEmail?.trim() || user.displayName || user.customerId;
  const returnUrl = searchParamsResolved.return_url ?? "/dashboard";

  return (
    <PinSetupGate hasPin={Boolean(user.paymentPinHash)}>
      <div className="min-h-screen bg-background-dark px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-5xl">
          <PaymentRequestFlow
            payerUserId={payer.id}
            recipientEmail={recipientEmail}
            returnUrl={returnUrl}
          />
        </div>
      </div>
    </PinSetupGate>
  );
}
