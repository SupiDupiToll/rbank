"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  metadata: unknown;
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
  const [showLogin, setShowLogin] = useState(Boolean(checkoutUser));
  const [customerId, setCustomerId] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [message, setMessage] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successRedirectUrl, setSuccessRedirectUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState(initialSession.transactionId);

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

  async function submitLogin() {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/pay/checkout/${initialSession.token}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerId, pin }),
      });

      const data = (await response.json()) as {
        error?: string;
        remainingAttempts?: number;
      };

      if (!response.ok) {
        setMessage(data.error ?? "Login fehlgeschlagen.");
        setRemainingAttempts(data.remainingAttempts ?? null);
        return;
      }

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPayment() {
    setIsProcessing(true);
    setMessage("");

    try {
      const [response] = await Promise.all([
        fetch(`/api/pay/checkout/${initialSession.token}/confirm`, {
          method: "POST",
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1500)),
      ]);

      const data = (await response.json()) as {
        error?: string;
        transactionId?: string;
        redirectUrl?: string;
      };

      if (!response.ok) {
        setIsProcessing(false);
        setMessage(data.error ?? "Zahlung konnte nicht ausgefuehrt werden.");
        router.refresh();
        return;
      }

      setTransactionId(data.transactionId ?? null);
      setSuccessRedirectUrl(data.redirectUrl ?? initialSession.redirectUrl);
      setIsProcessing(false);
    } catch {
      setIsProcessing(false);
      setMessage("Zahlung konnte nicht ausgefuehrt werden.");
    }
  }

  async function cancelPayment() {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/pay/checkout/${initialSession.token}/cancel`, {
        method: "POST",
      });
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
      <Card className="overflow-hidden rounded-[2rem] border border-emerald-500/10 bg-slate-950/90 p-0">
        <div className="border-b border-slate-800 bg-gradient-to-br from-emerald-500/10 via-slate-950 to-slate-950 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-xl font-black text-emerald-200">
              {initialSession.merchant.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-emerald-300">
                RBank Pay
              </p>
              <h1 className="mt-2 text-2xl font-black text-white">
                Bezahlung an {initialSession.merchant.name}
              </h1>
              <p className="mt-1 text-sm text-slate-300">🔒 Sichere Verbindung</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Betrag</p>
            <p className="mt-2 text-4xl font-black text-white">
              {formatEuroFromCents(initialSession.amount)}
            </p>
            <p className="mt-3 text-sm text-slate-300">{initialSession.description}</p>
          </div>

          {!showLogin && !checkoutUser ? (
            <div className="space-y-4">
              <Button className="h-14 w-full rounded-2xl text-base" onClick={() => setShowLogin(true)}>
                Mit RBank bezahlen
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

          {showLogin && !checkoutUser ? (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  CustomerID
                </label>
                <Input
                  inputMode="numeric"
                  maxLength={8}
                  onChange={(event) =>
                    setCustomerId(event.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  placeholder="47291836"
                  value={customerId}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-200">PIN</label>
                  <button
                    className="text-sm font-semibold text-emerald-300"
                    onClick={() => setShowPin((current) => !current)}
                    type="button"
                  >
                    {showPin ? "Verbergen" : "Anzeigen"}
                  </button>
                </div>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="1234"
                  type={showPin ? "text" : "password"}
                  value={pin}
                />
                <PinKeypad value={pin} onChange={setPin} />
              </div>

              {remainingAttempts !== null ? (
                <p className="text-sm text-amber-300">Noch {remainingAttempts} Versuche</p>
              ) : null}
              {message ? <p className="text-sm text-rose-300">{message}</p> : null}

              <Button
                className="h-14 w-full rounded-2xl text-base"
                disabled={isSubmitting || customerId.length !== 8 || pin.length < 4}
                onClick={() => void submitLogin()}
              >
                {isSubmitting ? "Pruefung laeuft..." : "Weiter"}
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

          {checkoutUser ? (
            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-400">Hallo, {checkoutUser.displayName}</p>
                <div className="mt-4 space-y-3 text-sm">
                  <Row label="Kontostand" value={formatEuroFromCents(checkoutUser.balanceCents)} />
                  <Row label="Belastung" value={`- ${formatEuroFromCents(initialSession.amount)}`} negative />
                  <Row
                    label="Verbleibend"
                    value={remainingBalance !== null ? formatEuroFromCents(remainingBalance) : "-"}
                    negative={Boolean(remainingBalance !== null && remainingBalance < 0)}
                  />
                  <Row label="An" value={initialSession.merchant.name} />
                </div>
              </div>

              {remainingBalance !== null && remainingBalance < 0 ? (
                <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  Nicht genug Guthaben
                </p>
              ) : null}
              {message ? <p className="text-sm text-rose-300">{message}</p> : null}

              <Button
                className="h-14 w-full rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                disabled={isProcessing || Boolean(remainingBalance !== null && remainingBalance < 0)}
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
            <p className="text-lg font-semibold text-white">Zahlung wird verarbeitet...</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
              RBank Checkout
            </p>
            <p className="mt-2 text-sm text-slate-400">{merchantName}</p>
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
  const title = titleMap[session.status as keyof typeof titleMap] ?? "Zahlung nicht verfuegbar";

  return (
    <Card className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-8 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.32em] text-slate-400">Status</p>
      <h1 className="mt-4 text-3xl font-black text-white">{title}</h1>
      <p className="mt-4 text-sm text-slate-300">
        {formatEuroFromCents(session.amount)} · {session.description}
      </p>
      <a
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full border border-slate-700 px-6 text-sm font-bold text-slate-100 transition hover:bg-slate-800"
        href={session.status === "COMPLETED" ? session.redirectUrl : session.cancelUrl}
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
    <Card className="rounded-[2rem] border border-emerald-500/20 bg-slate-950/90 p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15 text-4xl text-emerald-300">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-black text-white">Zahlung erfolgreich!</h1>
      <p className="mt-4 text-sm text-slate-300">
        {formatEuroFromCents(amount)} wurden an {merchantName} ueberwiesen.
      </p>
      {transactionId ? (
        <p className="mt-4 text-xs uppercase tracking-[0.28em] text-slate-500">
          Transaktion {transactionId}
        </p>
      ) : null}
      <a
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-bold text-slate-950"
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
      <span className={negative ? "font-bold text-rose-200" : "font-bold text-white"}>{value}</span>
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
