"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEuroFromCents } from "@/lib/money";

type EmbeddedCheckoutSession = {
  token: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  amount: number;
  currency: string;
  description: string;
  redirectUrl: string;
  cancelUrl: string;
  merchant: {
    name: string;
  };
  donationBoxName: string | null;
  transactionId: string | null;
};

type EmbeddedCheckoutUser = {
  id: string;
  customerId: string;
  displayName: string;
};

type Props = {
  initialSession: EmbeddedCheckoutSession;
  availableUsers: EmbeddedCheckoutUser[];
  embedKey: string;
};

const PIN_LENGTH = 4;

export function EmbeddedCheckoutFlow({
  initialSession,
  availableUsers,
  embedKey,
}: Props) {
  const [step, setStep] = useState<"user" | "pin">("user");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    availableUsers[0]?.id ?? null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentPin, setPaymentPin] = useState("");
  const [message, setMessage] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successRedirectUrl, setSuccessRedirectUrl] = useState<string | null>(
    null,
  );
  const [transactionId, setTransactionId] = useState(
    initialSession.transactionId,
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return availableUsers;
    }

    return availableUsers.filter((user) => {
      return (
        user.customerId.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query)
      );
    });
  }, [availableUsers, searchTerm]);

  const selectedUser = useMemo(
    () => availableUsers.find((user) => user.id === selectedUserId) ?? null,
    [availableUsers, selectedUserId],
  );

  useEffect(() => {
    if (selectedUserId || filteredUsers.length === 0) {
      return;
    }

    setSelectedUserId(filteredUsers[0]?.id ?? null);
  }, [filteredUsers, selectedUserId]);

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
    if (!selectedUser) {
      setMessage("Bitte zuerst einen Nutzer auswaehlen.");
      return;
    }

    if (paymentPin.length < PIN_LENGTH) {
      setMessage("Bitte die PIN eingeben.");
      return;
    }

    setIsProcessing(true);
    setMessage("");
    setRemainingAttempts(null);

    try {
      const [response] = await Promise.all([
        fetch(
          `/api/pay/embed/${initialSession.token}/confirm?key=${encodeURIComponent(embedKey)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customerId: selectedUser.customerId,
              pin: paymentPin,
            }),
          },
        ),
        new Promise((resolve) => window.setTimeout(resolve, 1200)),
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
      <Shell>
        <SuccessState
          amount={initialSession.amount}
          merchantName={initialSession.merchant.name}
          redirectUrl={successRedirectUrl}
          transactionId={transactionId}
        />
      </Shell>
    );
  }

  if (initialSession.status !== "PENDING") {
    return (
      <Shell>
        <StatusCard session={initialSession} />
      </Shell>
    );
  }

  return (
    <Shell>
      <Header
        session={initialSession}
        step={step}
      />

      {isProcessing ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-300" />
            <p className="text-sm font-semibold text-white">
              Zahlung wird verarbeitet...
            </p>
          </div>
        </div>
      ) : step === "user" ? (
        <UserStep
          filteredUsers={filteredUsers}
          searchTerm={searchTerm}
          selectedUserId={selectedUserId}
          onSearchChange={setSearchTerm}
          onSelect={(id) => {
            setSelectedUserId(id);
            setSearchTerm("");
          }}
          onNext={() => setStep("pin")}
          onCancel={() => void cancelPayment()}
          cancelDisabled={isSubmitting}
        />
      ) : (
        <PinStep
          user={selectedUser}
          paymentPin={paymentPin}
          remainingAttempts={remainingAttempts}
          message={message}
          processing={isProcessing}
          onPinChange={setPaymentPin}
          onSubmit={() => void submitPayment()}
          onBack={() => {
            setStep("user");
            setPaymentPin("");
            setMessage("");
            setRemainingAttempts(null);
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.18),_transparent_36%),linear-gradient(180deg,_#030712_0%,_#020617_100%)] px-4 py-5 text-slate-100">
      {children}
    </div>
  );
}

function Header({
  session,
  step,
}: {
  session: EmbeddedCheckoutSession;
  step: "user" | "pin";
}) {
  const title = session.donationBoxName
    ? `Spende an ${session.donationBoxName}`
    : session.merchant.name;

  return (
    <div className="mb-4 text-center">
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
        <StepDot active={step === "user"} done={step === "pin"} label="Nutzer" />
        <span className={step === "pin" ? "h-px w-5 bg-emerald-400/50" : "h-px w-5 bg-slate-800"} />
        <StepDot active={step === "pin"} done={false} label="PIN" />
      </div>
      <p className="mt-2 truncate text-sm font-bold text-white">{title}</p>
      <p className="mt-0.5 text-2xl font-black tracking-tight text-emerald-300">
        {formatEuroFromCents(session.amount)}
      </p>
    </div>
  );
}

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <span
      className={`flex items-center gap-1.5 ${
        active || done ? "text-white" : "text-slate-600"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
          done
            ? "bg-emerald-400 text-slate-950"
            : active
              ? "border border-emerald-400 text-emerald-300"
              : "border border-slate-800 text-slate-600"
        }`}
      >
        {done ? "✓" : active ? "•" : ""}
      </span>
      {label}
    </span>
  );
}

function UserStep({
  filteredUsers,
  searchTerm,
  selectedUserId,
  onSearchChange,
  onSelect,
  onNext,
  onCancel,
  cancelDisabled,
}: {
  filteredUsers: EmbeddedCheckoutUser[];
  searchTerm: string;
  selectedUserId: string | null;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNext: () => void;
  onCancel: () => void;
  cancelDisabled: boolean;
}) {
  const selected = filteredUsers.find((u) => u.id === selectedUserId) ?? null;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <input
        className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400/50 focus:outline-none"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Nutzer suchen"
        value={searchTerm}
      />

      <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        {filteredUsers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-500">
            Keine Nutzer gefunden.
          </p>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = user.id === selectedUserId;

            return (
              <button
                key={user.id}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  isSelected
                    ? "border-emerald-400/50 bg-emerald-400/10"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                }`}
                onClick={() => onSelect(user.id)}
                type="button"
              >
                <p className="truncate text-sm font-semibold text-white">
                  {user.displayName}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  #{user.customerId}
                </p>
              </button>
            );
          })
        )}
      </div>

      <button
        className={`mt-3 w-full rounded-lg py-2.5 text-sm font-bold transition ${
          selected
            ? "bg-emerald-400 text-slate-950 hover:brightness-110"
            : "cursor-not-allowed bg-slate-800/60 text-slate-500"
        }`}
        disabled={!selected}
        onClick={onNext}
        type="button"
      >
        {selected ? "Weiter" : "Nutzer waehlen"}
      </button>
      <button
        className="mt-2 w-full text-center text-xs font-semibold text-slate-500 transition hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={cancelDisabled}
        onClick={onCancel}
        type="button"
      >
        Abbrechen
      </button>
    </div>
  );
}

function PinStep({
  user,
  paymentPin,
  remainingAttempts,
  message,
  processing,
  onPinChange,
  onSubmit,
  onBack,
}: {
  user: EmbeddedCheckoutUser | null;
  paymentPin: string;
  remainingAttempts: number | null;
  message: string;
  processing: boolean;
  onPinChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {user ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
          <p className="truncate text-sm font-semibold text-white">
            {user.displayName}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            #{user.customerId}
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex justify-center gap-2">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className={`flex h-10 w-8 items-center justify-center rounded-md border text-base font-bold ${
              index < paymentPin.length
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                : "border-slate-800 bg-slate-950/70 text-transparent"
            }`}
          >
            *
          </div>
        ))}
      </div>

      <div className="mt-3 grid flex-1 grid-cols-3 gap-1.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"].map(
          (key, index) =>
            key ? (
              <button
                key={`${key}-${index}`}
                className="flex h-12 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-base font-bold text-white transition hover:border-emerald-400/40 hover:bg-slate-800"
                onClick={() => {
                  if (key === "←") {
                    onPinChange(paymentPin.slice(0, -1));
                    return;
                  }

                  if (paymentPin.length >= 6) {
                    return;
                  }

                  onPinChange(`${paymentPin}${key}`);
                }}
                type="button"
              >
                {key === "←" ? "⌫" : key}
              </button>
            ) : (
              <div key={`empty-${index}`} />
            ),
        )}
      </div>

      {remainingAttempts !== null ? (
        <p className="mt-2 text-center text-xs text-amber-300">
          Noch {remainingAttempts} Versuche
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 text-center text-xs text-rose-300">{message}</p>
      ) : null}

      <button
        className={`mt-3 w-full rounded-lg py-2.5 text-sm font-bold transition ${
          !processing && paymentPin.length >= PIN_LENGTH
            ? "bg-emerald-400 text-slate-950 hover:brightness-110"
            : "cursor-not-allowed bg-slate-800/60 text-slate-500"
        }`}
        disabled={processing || paymentPin.length < PIN_LENGTH}
        onClick={onSubmit}
        type="button"
      >
        Jetzt bezahlen
      </button>
      <button
        className="mt-2 w-full text-center text-xs font-semibold text-slate-500 transition hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={processing}
        onClick={onBack}
        type="button"
      >
        Zurueck
      </button>
    </div>
  );
}

function StatusCard({ session }: { session: EmbeddedCheckoutSession }) {
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
    <div className="flex flex-col items-center text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        Status
      </p>
      <h1 className="mt-3 text-2xl font-black tracking-tight text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        {formatEuroFromCents(session.amount)} · {session.description}
      </p>
      <a
        className="mt-6 rounded-full border-2 border-slate-800 px-6 py-2.5 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800"
        href={
          session.status === "COMPLETED"
            ? session.redirectUrl
            : session.cancelUrl
        }
      >
        Zurueck zum Shop
      </a>
    </div>
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
    <div className="flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">
        ✓
      </div>
      <h1 className="mt-4 text-2xl font-black tracking-tight text-white">
        Zahlung erfolgreich!
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        {formatEuroFromCents(amount)} wurden an {merchantName} ueberwiesen.
      </p>
      {transactionId ? (
        <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">
          Transaktion {transactionId}
        </p>
      ) : null}
      <a
        className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-background-dark"
        href={redirectUrl}
      >
        Jetzt zum Shop zurueck
      </a>
    </div>
  );
}
