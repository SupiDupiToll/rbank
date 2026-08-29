import { PaymentQrScanner } from "@/components/payment-qr-scanner";
import { getCurrentAppUser } from "@/lib/current-user";

export default async function ReceivePaymentPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4 pb-8">
      <header>
        <p className="font-label-sm text-label-sm text-primary">Zahlung</p>
        <h2 className="font-headline-md text-headline-md mt-1 text-on-surface">
          QR-Code scannen
        </h2>
      </header>
      <PaymentQrScanner myUserId={user.id} />
    </div>
  );
}
