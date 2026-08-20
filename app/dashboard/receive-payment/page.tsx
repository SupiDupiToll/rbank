import { PaymentQrScanner } from "@/components/payment-qr-scanner";

export default function ReceivePaymentPage() {
  return (
    <div className="space-y-8 pb-8">
      <header>
        <p className="font-label-sm text-label-sm text-primary">Zahlung</p>
        <h2 className="font-headline-md text-headline-md mt-2 text-on-surface">
          Empfangen
        </h2>
      </header>
      <PaymentQrScanner />
    </div>
  );
}