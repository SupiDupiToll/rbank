"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEuroFromCents } from "@/lib/money";

type CheckoutSession = {
  token: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  amount: number;
  currency: string;
  description: string;
  redirectUrl: string;
  cancelUrl: string;
  merchant: {
    name: string;
    merchantId: string;
  };
  paidAt: string | null;
  expiresAt: string;
  customerId: string | null;
  customerName: string | null;
  donationBoxName: string | null;
  metadata: unknown;
  recipientCustomerId: string | null;
  recipientName: string | null;
  transactionId: string | null;
  refundedAt: string | null;
};

type CheckoutUser = {
  id: string;
  customerId: string;
  displayName: string;
  balanceCents: number;
} | null;

type Props = {
  initialSession: CheckoutSession;
  checkoutUser: CheckoutUser;
};

export function CheckoutFlow({ initialSession, checkoutUser }: Props) {
  const router = useRouter();
  const [paymentPin, setPaymentPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [message, setMessage] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successRedirectUrl, setSuccessRedirectUrl] = useState<string | null>(
    null,
  );
  const [transactionId, setTransactionId] = useState(
    initialSession.transactionId,
  );
  const payeeName =
    initialSession.donationBoxName ?? initialSession.merchant.name;
  const paymentHeadline = initialSession.donationBoxName
    ? `Spende an ${payeeName}`
    : `Bezahlung an ${initialSession.merchant.name}`;
  const paymentBadge = initialSession.donationBoxName
    ? "Spendenbox"
    : "RBank Pay";
  const paymentPinMinLength = 4;

  const remainingBalance = useMemo(() => {
    if (!checkoutUser) {
      return null;
    }

    return checkoutUser.balanceCents - initialSession.amount;
  }, [checkoutUser, initialSession.amount]);

  useEffect(() => {
    if (!successRedirectUrl) {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.location.href = successRedirectUrl;
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [successRedirectUrl]);

  async function submitPayment() {
    if (paymentPin.length < paymentPinMinLength) {
      setMessage("Bitte die PIN eingeben.");
      return;
    }

    setIsProcessing(true);
    setMessage("");
    setRemainingAttempts(null);

    try {
      const [response] = await Promise.all([
        fetch(`/api/pay/checkout/${initialSession.token}/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pin: paymentPin }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1500)),
      ]);

      const data = (await response.json()) as {
        error?: string;
        remainingAttempts?: number;
        transactionId?: string;
        redirectUrl?: string;
      };

      if (!response.ok) {
        setIsProcessing(false);
        setMessage(data.error ?? "Zahlung konnte nicht ausgefuehrt werden.");
        setRemainingAttempts(data.remainingAttempts ?? null);
        router.refresh();
        return;
      }

      setTransactionId(data.transactionId ?? null);
      setSuccessRedirectUrl(data.redirectUrl ?? initialSession.redirectUrl);
      setPaymentPin("");
      setIsProcessing(false);
    } catch {
      setIsProcessing(false);
      setMessage("Zahlung konnte nicht ausgefuehrt werden.");
    }
  }

  async function cancelPayment() {
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/pay/checkout/${initialSession.token}/cancel`,
        {
          method: "POST",
        },
      );
      const data = (await response.json()) as { redirectUrl?: string };
      window.location.href = data.redirectUrl ?? initialSession.cancelUrl;
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successRedirectUrl) {
    return (
      <CheckoutShell merchantName={initialSession.merchant.name}>
        <SuccessState
          amount={initialSession.amount}
          merchantName={initialSession.merchant.name}
          redirectUrl={successRedirectUrl}
          transactionId={transactionId}
        />
      </CheckoutShell>
    );
  }

  if (initialSession.status !== "PENDING") {
    return (
      <CheckoutShell merchantName={initialSession.merchant.name}>
        <StatusCard session={initialSession} />
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell merchantName={initialSession.merchant.name}>
      <Card className="overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900/40 p-0">
        <div className="relative overflow-hidden border-b border-slate-800 px-6 py-8 sm:px-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/20" />
          <div className="pointer-events-none absolute -bottom-14 -left-14 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-black text-primary">
              {initialSession.merchant.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-primary">
                {paymentBadge}
              </p>
              <h1 className="mt-3 text-4xl font-display font-black leading-[1.1] tracking-tight text-white sm:text-5xl">
                {paymentHeadline}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                Sicherer Checkout mit PIN-Bestaetigung und direkter Belastung
                deines RBank-Kontos.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-6">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Betrag
            </p>
            <p className="mt-3 text-5xl font-display font-black tracking-tight text-white">
              {formatEuroFromCents(initialSession.amount)}
            </p>
            {initialSession.donationBoxName ? (
              <p className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
                {initialSession.donationBoxName}
              </p>
            ) : null}
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              {initialSession.description}
            </p>
          </div>

          {checkoutUser ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-6">
                <p className="text-sm text-slate-400">
                  Hallo, {checkoutUser.displayName}
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <Row
                    label="Kontostand"
                    value={formatEuroFromCents(checkoutUser.balanceCents)}
                  />
                  <Row
                    label="Belastung"
                    value={`- ${formatEuroFromCents(initialSession.amount)}`}
                    negative
                  />
                  <Row
                    label="Verbleibend"
                    value={
                      remainingBalance !== null
                        ? formatEuroFromCents(remainingBalance)
                        : "-"
                    }
                    negative={Boolean(
                      remainingBalance !== null && remainingBalance < 0,
                    )}
                  />
                  <Row
                    label={initialSession.donationBoxName ? "Spendenbox" : "An"}
                    value={payeeName}
                  />
                </div>
              </div>

              {remainingBalance !== null && remainingBalance < 0 ? (
                <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  Nicht genug Guthaben
                </p>
              ) : null}
              <div className="space-y-4 rounded-xl border border-slate-800/50 bg-slate-900/40 p-6">
                <p className="text-sm font-bold uppercase tracking-widest text-primary">
                  PIN bestaetigen
                </p>
                <div className="grid grid-cols-6 gap-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      aria-hidden="true"
                      className={`flex h-14 items-center justify-center rounded-2xl border text-2xl ${
                        index < paymentPin.length
                          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                          : "border-slate-800 bg-slate-950/70 text-slate-500"
                      }`}
                    >
                      {index < paymentPin.length ? "*" : ""}
                    </div>
                  ))}
                </div>
                <PinKeypad value={paymentPin} onChange={setPaymentPin} />
                {remainingAttempts !== null ? (
                  <p className="text-sm text-amber-300">
                    Noch {remainingAttempts} Versuche
                  </p>
                ) : null}
              </div>
              {message ? (
                <p className="text-sm text-rose-300">{message}</p>
              ) : null}

              <Button
                className="h-14 w-full rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                disabled={
                  isProcessing ||
                  paymentPin.length < paymentPinMinLength ||
                  Boolean(remainingBalance !== null && remainingBalance < 0)
                }
                onClick={() => void submitPayment()}
              >
                Jetzt bezahlen
              </Button>
              <button
                className="w-full text-sm font-semibold text-slate-400 transition hover:text-slate-200"
                onClick={() => void cancelPayment()}
                type="button"
              >
                Abbrechen
              </button>
            </div>
          ) : null}
        </div>
      </Card>

      {isProcessing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-6">
          <div className="space-y-5 text-center">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-300" />
            <p className="text-lg font-semibold text-white">
              Zahlung wird verarbeitet...
            </p>
          </div>
        </div>
      ) : null}
    </CheckoutShell>
  );
}

function CheckoutShell({
  children,
  merchantName,
}: {
  children: React.ReactNode;
  merchantName: string;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.2),_transparent_32%),linear-gradient(180deg,_#030712_0%,_#020617_100%)] px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <div className="w-full">
          <div className="mb-4 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              RBank Checkout
            </p>
            <p className="mt-3 text-base text-slate-400">{merchantName}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusCard({ session }: { session: CheckoutSession }) {
  const titleMap = {
    COMPLETED: "Diese Zahlung wurde bereits durchgeführt",
    CANCELLED: "Diese Zahlung wurde abgebrochen",
    EXPIRED: "Dieser Zahlungslink ist abgelaufen",
    REFUNDED: "Diese Zahlung wurde bereits erstattet",
  } as const;
  const title =
    titleMap[session.status as keyof typeof titleMap] ??
    "Zahlung nicht verfuegbar";

  return (
    <Card className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-8 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        Status
      </p>
      <h1 className="mt-5 text-4xl font-display font-black tracking-tight text-white">
        {title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-400">
        {formatEuroFromCents(session.amount)} · {session.description}
      </p>
      <a
        className="mt-8 inline-flex h-14 items-center justify-center rounded-full border-2 border-slate-800 px-8 text-lg font-bold text-slate-100 transition-colors hover:bg-slate-800"
        href={
          session.status === "COMPLETED"
            ? session.redirectUrl
            : session.cancelUrl
        }
      >
        Zurueck zum Shop
      </a>
    </Card>
  );
}

function SuccessState({
  amount,
  merchantName,
  redirectUrl,
  transactionId,
}: {
  amount: number;
  merchantName: string;
  redirectUrl: string;
  transactionId: string | null;
}) {
  return (
    <Card className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl text-primary">
        ✓
      </div>
      <h1 className="mt-6 text-4xl font-display font-black tracking-tight text-white">
        Zahlung erfolgreich!
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-400">
        {formatEuroFromCents(amount)} wurden an {merchantName} ueberwiesen.
      </p>
      {transactionId ? (
        <p className="mt-4 text-xs uppercase tracking-[0.28em] text-slate-500">
          Transaktion {transactionId}
        </p>
      ) : null}
      <a
        className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-lg font-bold text-background-dark"
        href={redirectUrl}
      >
        Jetzt zum Shop zurueck
      </a>
    </Card>
  );
}

function Row({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span
        className={
          negative ? "font-bold text-rose-200" : "font-bold text-white"
        }
      >
        {value}
      </span>
    </div>
  );
}

function PinKeypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"];

  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((key, index) =>
        key ? (
          <button
            key={`${key}-${index}`}
            className="flex h-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-lg font-bold text-white transition hover:border-emerald-400/30 hover:bg-slate-800"
            onClick={() => {
              if (key === "←") {
                onChange(value.slice(0, -1));
                return;
              }

              if (value.length >= 6) {
                return;
              }

              onChange(`${value}${key}`);
            }}
            type="button"
          >
            {key}
          </button>
        ) : (
          <div key={`empty-${index}`} />
        ),
      )}
    </div>
  );
}
