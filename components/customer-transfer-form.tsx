"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type CustomerTransferFormProps = {
  balanceCents: number;
  airBalance: number;
};

type TransferCurrency = "EUR" | "AIR";

const PIN_LENGTH = 4;
const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function CustomerTransferForm({
  balanceCents,
  airBalance,
}: CustomerTransferFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "pin">("form");
  const [currency, setCurrency] = useState<TransferCurrency>("EUR");
  const [recipientInput, setRecipientInput] = useState("");
  const [resolvedRecipient, setResolvedRecipient] = useState("");
  const [resolvedCustomerId, setResolvedCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [isResolvingRecipient, setIsResolvingRecipient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);

  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  const isAmountValid = Number.isInteger(amountCents) && amountCents > 0;
  const availableBalance = currency === "AIR" ? airBalance : balanceCents;
  const formattedAvailableBalance =
    currency === "AIR"
      ? formatAirFromUnits(availableBalance)
      : formatEuroFromCents(availableBalance);
  const formattedTransferAmount =
    currency === "AIR"
      ? formatAirFromUnits(amountCents)
      : formatEuroFromCents(amountCents);

  useEffect(() => {
    const normalized = recipientInput.trim();

    setResolvedRecipient("");
    setResolvedCustomerId("");
    setMessage("");

    const isCustomerId = /^\d{8}$/.test(normalized);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

    if (!isCustomerId && !isEmail) {
      return;
    }

    const controller = new AbortController();

    async function resolveRecipient() {
      setIsResolvingRecipient(true);

      try {
        const response = await fetch(
          `/api/customer/resolve/${encodeURIComponent(normalized)}`,
          {
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as {
          customerId?: string;
          displayName?: string;
          error?: string;
        };

        if (!response.ok) {
          setMessage(data.error ?? "Empfänger konnte nicht geprüft werden.");
          return;
        }

        setResolvedRecipient(data.displayName ?? "");
        setResolvedCustomerId(data.customerId ?? "");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setMessage("Empfänger konnte nicht geprüft werden.");
        }
      } finally {
        setIsResolvingRecipient(false);
      }
    }

    void resolveRecipient();

    return () => controller.abort();
  }, [recipientInput]);

  function goToPinStep() {
    if (!resolvedCustomerId || !isAmountValid || !description.trim()) {
      setMessage("Bitte alle Felder korrekt ausfüllen.");
      return;
    }

    if (amountCents > availableBalance) {
      setMessage("Der verfügbare Kontostand reicht nicht aus.");
      return;
    }

    setMessage("");
    setStep("pin");
  }

  function handleDigitInput(digit: string) {
    setMessage("");
    setPin((currentPin) =>
      currentPin.length >= PIN_LENGTH ? currentPin : `${currentPin}${digit}`,
    );
  }

  function handleBackspace() {
    setMessage("");
    setPin((currentPin) => currentPin.slice(0, -1));
  }

  async function handleSubmit() {
    if (pin.length !== PIN_LENGTH) {
      setMessage("Bitte die 4-stellige PIN eingeben.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/customer/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
        },
        body: JSON.stringify({
          recipientCustomerId: resolvedCustomerId,
          amount: amountCents,
          currency,
          description: description.trim(),
          pin,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Überweisung konnte nicht ausgeführt werden.");
        return;
      }

      setIsSuccessful(true);
      setRecipientInput("");
      setResolvedRecipient("");
      setResolvedCustomerId("");
      setAmount("");
      setDescription("");
      setPin("");
      setStep("form");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccessful) {
    return (
      <div className="space-y-5">
        <div className="glass-card flex flex-col items-center gap-3 rounded-xl border-secondary/30 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-secondary">
            check_circle
          </span>
          <p className="font-semibold text-on-surface">
            Überweisung erfolgreich ausgeführt.
          </p>
        </div>
        <Button
          className="w-full"
          onClick={() => {
            setIsSuccessful(false);
            setMessage("");
          }}
          type="button"
        >
          Neue Überweisung
        </Button>
      </div>
    );
  }

  if (step === "pin") {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-label-sm text-label-sm text-primary">
              Schritt 2
            </p>
            <h3 className="font-headline-md text-headline-md mt-2 text-on-surface">
              PIN eingeben
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Bestätige die Überweisung mit deiner 4-stelligen PIN.
            </p>
          </div>
          <Button
            onClick={() => {
              setStep("form");
              setPin("");
              setMessage("");
            }}
            type="button"
            variant="outline"
          >
            Zurück
          </Button>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Betrag
          </p>
          <p className="font-balance-display text-balance-display mt-2 text-primary">
            {isAmountValid
              ? formattedTransferAmount
              : currency === "AIR"
                ? "0 AIR"
                : "0,00 €"}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Währung
              </p>
              <p className="mt-1 font-semibold text-on-surface">{currency}</p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Empfänger
              </p>
              <p className="mt-1 font-semibold text-on-surface">
                {resolvedRecipient || recipientInput}
              </p>
            </div>
          </div>
          {description.trim() ? (
            <div className="mt-4">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Verwendungszweck
              </p>
              <p className="mt-1 font-semibold text-on-surface">
                {description.trim()}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="font-label-sm text-label-sm text-on-surface">
            Deine PIN
          </p>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: PIN_LENGTH }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className={cn(
                  "flex h-16 items-center justify-center rounded-2xl border text-3xl",
                  index < pin.length
                    ? "border-primary/40 bg-primary-container/20 text-primary"
                    : "glass-card text-on-surface-variant",
                )}
              >
                {index < pin.length ? "*" : "•"}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {keypadDigits.map((digit) => (
            <Button
              key={digit}
              className="h-16 rounded-2xl text-2xl"
              disabled={isSubmitting}
              onClick={() => handleDigitInput(digit)}
              type="button"
              variant="outline"
            >
              {digit}
            </Button>
          ))}
          <Button
            className="h-16 rounded-2xl text-sm"
            disabled={isSubmitting}
            onClick={handleBackspace}
            type="button"
            variant="outline"
          >
            Löschen
          </Button>
          <Button
            className="h-16 rounded-2xl text-2xl"
            disabled={isSubmitting}
            onClick={() => handleDigitInput("0")}
            type="button"
            variant="outline"
          >
            0
          </Button>
          <Button
            className="h-16 rounded-2xl"
            disabled={isSubmitting || pin.length !== PIN_LENGTH}
            onClick={handleSubmit}
            type="button"
          >
            OK
          </Button>
        </div>

        {message ? <p className="text-sm text-error">{message}</p> : null}

        <Button
          className="w-full"
          disabled={isSubmitting || pin.length !== PIN_LENGTH}
          onClick={handleSubmit}
          type="button"
        >
          {isSubmitting
            ? "Überweisung wird geprüft..."
            : "Überweisung bestätigen"}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        goToPinStep();
      }}
    >
      <div className="glass-card flex items-center gap-3 rounded-2xl p-4">
        <span className="material-symbols-outlined text-primary">
          account_balance_wallet
        </span>
        <p className="text-sm text-on-surface">
          Aktueller Kontostand:{" "}
          <span className="font-bold text-primary">
            {formattedAvailableBalance}
          </span>
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-on-surface">Währung</label>
        <select
          className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-primary"
          onChange={(event) => setCurrency(event.target.value as TransferCurrency)}
          value={currency}
        >
          <option value="EUR">EUR</option>
          <option value="AIR">AIR</option>
        </select>
        <p className="text-xs text-on-surface-variant">
          AIR ist eine interne Prämienwährung und kann nicht in Echtgeld
          umgetauscht werden.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-on-surface">
          Empfänger-Kundennummer oder E-Mail
        </label>
        <Input
          inputMode="email"
          onChange={(event) => setRecipientInput(event.target.value)}
          placeholder="47291836 oder max@example.com"
          value={recipientInput}
        />
        <p className="flex min-h-5 items-center gap-1 text-xs text-on-surface-variant">
          {isResolvingRecipient ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border border-on-surface-variant border-t-primary" />
              Empfänger wird geprüft...
            </>
          ) : resolvedRecipient ? (
            <>
              <span className="material-symbols-outlined text-sm text-secondary">
                check_circle
              </span>
              Empfänger: {resolvedRecipient}
            </>
          ) : (
            "Kundennummer oder E-Mail-Adresse eingeben"
          )}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-on-surface">
          Betrag in {currency}
        </label>
        <Input
          inputMode="decimal"
          onChange={(event) => setAmount(event.target.value)}
          placeholder="25,00"
          value={amount}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-on-surface">
          Verwendungszweck
        </label>
        <Input
          maxLength={120}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Lunch, Geschenk, Rückzahlung"
          value={description}
        />
      </div>

      {message ? <p className="text-sm text-error">{message}</p> : null}

      <Button
        className="w-full"
        disabled={isSubmitting || isResolvingRecipient || !resolvedRecipient}
        type="submit"
      >
        Weiter zur PIN
      </Button>
    </form>
  );
}