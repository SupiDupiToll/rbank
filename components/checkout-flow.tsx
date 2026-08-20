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
      <Card className="glass-card overflow-hidden p-0">
        <div className="relative overflow-hidden border-b border-white/10 px-6 py-8 sm:px-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-secondary-container/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-14 h-28 w-28 rounded-full bg-primary-container/20 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="glass-card mesh-gradient flex h-14 w-14 shrink-0 items-center justify-center font-label-sm text-lg text-primary">
              {initialSession.merchant.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-primary">
                {paymentBadge}
              </p>
              <h1 className="font-headline-md text-headline-md mt-3 font-black tracking-tight text-on-surface">
                {paymentHeadline}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
                Sicherer Checkout mit PIN-Bestaetigung und direkter Belastung
                deines RBank-Kontos.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="glass-card mesh-gradient p-6">
            <p className="font-label-sm text-label-sm text-primary">Betrag</p>
            <p className="font-balance-display text-balance-display mt-3 font-black tracking-tight text-on-surface">
              {formatEuroFromCents(initialSession.amount)}
            </p>
            {initialSession.donationBoxName ? (
              <p className="font-label-sm text-label-sm mt-4 text-primary">
                {initialSession.donationBoxName}
              </p>
            ) : null}
            <p className="mt-4 text-base leading-relaxed text-on-surface-variant">
              {initialSession.description}
            </p>
          </div>

          {checkoutUser ? (
            <div className="space-y-5">
              <div className="glass-card p-6">
                <p className="text-sm text-on-surface-variant">
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

              <div className="glass-card p-6">
                <p className="font-label-sm text-label-sm text-primary">
                  PIN bestaetigen
                </p>
                <div className="mt-4 grid grid-cols-6 gap-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      aria-hidden="true"
                      className={`flex h-14 items-center justify-center rounded-2xl border text-2xl ${
                        index < paymentPin.length
                          ? "border-primary/40 bg-primary-container/20 text-primary"
                          : "border-white/10 bg-surface-container-high/70 text-on-surface-variant"
                      }`}
                    >
                      {index < paymentPin.length ? "*" : ""}
                    </div>
                  ))}
                </div>
                <PinKeypad value={paymentPin} onChange={setPaymentPin} />
                {remainingAttempts !== null ? (
                  <p className="mt-3 text-sm text-error">
                    Noch {remainingAttempts} Versuche
                  </p>
                ) : null}
              </div>
              {message ? <p className="text-sm text-error">{message}</p> : null}

              <Button
                className="h-14 w-full rounded-2xl text-base"
                disabled={isProcessing || paymentPin.length < paymentPinMinLength}
                onClick={() => void submitPayment()}
              >
                Jetzt bezahlen
              </Button>
              <button
                className="w-full text-sm font-semibold text-on-surface-variant transition hover:text-on-surface"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-md">
          <div className="space-y-5 text-center">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-surface-container-highest border-t-primary" />
            <p className="text-lg font-semibold text-on-surface">
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
    <div className="min-h-screen px-4 py-8 text-on-surface sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <div className="w-full">
          <div className="mb-4 text-center">
            <div className="glass-card mesh-gradient mx-auto mb-3 flex h-16 w-16 items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">
                account_balance
              </span>
            </div>
            <p className="font-label-sm text-label-sm text-primary">
              RBank Checkout
            </p>
            <p className="mt-2 text-base text-on-surface-variant">
              {merchantName}
            </p>
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
    <Card className="glass-card p-8 text-center">
      <p className="font-label-sm text-label-sm text-primary">Status</p>
      <h1 className="font-headline-md text-headline-md mt-5 font-black tracking-tight text-on-surface">
        {title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
        {formatEuroFromCents(session.amount)} · {session.description}
      </p>
      <a
        className="mt-8 inline-flex h-14 items-center justify-center rounded-full border-2 border-white/15 px-8 text-lg font-bold text-on-surface transition-colors hover:bg-surface-container"
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
    <Card className="glass-card p-8 text-center">
      <div className="glass-card mesh-gradient mx-auto flex h-20 w-20 items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary">
          check_circle
        </span>
      </div>
      <h1 className="font-headline-md text-headline-md mt-6 font-black tracking-tight text-on-surface">
        Zahlung erfolgreich!
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
        {formatEuroFromCents(amount)} wurden an {merchantName} ueberwiesen.
      </p>
      {transactionId ? (
        <p className="font-label-sm text-label-sm mt-4 text-on-surface-variant/70">
          Transaktion {transactionId}
        </p>
      ) : null}
      <a
        className="bg-primary-container glow-effect mt-8 inline-flex h-14 items-center justify-center rounded-full px-8 text-lg font-bold text-white transition-colors hover:opacity-90"
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
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={
          negative ? "font-bold text-error" : "font-bold text-on-surface"
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
    <div className="mt-4 grid grid-cols-3 gap-3">
      {keys.map((key, index) =>
        key ? (
          <button
            key={`${key}-${index}`}
            className="glass-card flex h-14 items-center justify-center rounded-2xl text-lg font-bold text-on-surface transition hover:border-primary/40 hover:bg-surface-container"
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
            {key === "←" ? (
              <span className="material-symbols-outlined text-lg">backspace</span>
            ) : (
              key
            )}
          </button>
        ) : (
          <div key={`empty-${index}`} />
        ),
      )}
    </div>
  );
}