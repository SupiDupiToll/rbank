import { PaymentQrScanner } from "@/components/payment-qr-scanner";

export default function ReceivePaymentPage() {
  return (
    <div className="space-y-8 pb-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Zahlung
        </p>
        <h2 className="mt-2 text-3xl font-display text-slate-100">Empfangen</h2>
      </header>
      <PaymentQrScanner />
    </div>
  );
}
