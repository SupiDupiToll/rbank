"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  appendDigits,
  NumericKeypad,
  removeLastDigit,
} from "@/components/ui/numeric-keypad";
import { Stepper } from "@/components/ui/stepper";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type CustomerTransferFormProps = {
  balanceCents: number;
  airBalance: number;
};

type TransferCurrency = "EUR" | "AIR";

const PIN_LENGTH = 4;
const MAX_DIGITS = 9;
const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const STEP_LABELS = [
  "Betrag",
  "Empfänger",
  "Notiz",
  "Prüfen",
  "PIN",
];

export function CustomerTransferForm({
  balanceCents,
  airBalance,
}: CustomerTransferFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState<TransferCurrency>("EUR");
  const [amountCents, setAmountCents] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [resolvedRecipient, setResolvedRecipient] = useState("");
  const [resolvedCustomerId, setResolvedCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [isResolvingRecipient, setIsResolvingRecipient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { customerId: string; displayName: string }[]
  >([]);

  const availableBalance = currency === "AIR" ? airBalance : balanceCents;
  const availableBalanceLabel = useMemo(
    () =>
      currency === "AIR"
        ? formatAirFromUnits(availableBalance)
        : formatEuroFromCents(availableBalance),
    [currency, availableBalance],
  );

  const numericAmount = amountCents === "" ? 0 : Number(amountCents);
  const isAmountValid = numericAmount > 0;
  const enteredAmountLabel =
    currency === "AIR"
      ? formatAirFromUnits(numericAmount)
      : formatEuroFromCents(numericAmount);

  const formattedTransferAmount =
    currency === "AIR"
      ? formatAirFromUnits(Number(amountCents || "0"))
      : formatEuroFromCents(Number(amountCents || "0"));

  useEffect(() => {
    const normalized = recipientInput.trim();

    setResolvedRecipient("");
    setResolvedCustomerId("");
    setMessage("");

    const searchController = new AbortController();
    const searchTimeout = setTimeout(async () => {
      // Exakte Kundennummern werden über den Resolver bestätigt – keine Suche nötig.
      if (normalized.length < 2 || /^\d{8}$/.test(normalized)) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/customer/search?q=${encodeURIComponent(normalized)}`,
          { signal: searchController.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          customers: { customerId: string; displayName: string }[];
        };
        setSuggestions(data.customers ?? []);
      } catch {
        // Suche ist optional – still ignorieren.
      }
    }, 250);

    return () => {
      searchController.abort();
      clearTimeout(searchTimeout);
    };
  }, [recipientInput]);

  useEffect(() => {
    const normalized = recipientInput.trim();


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

  function validateAmountInput(): boolean {
    setMessage("");
    if (!isAmountValid) {
      setMessage("Bitte einen gültigen Betrag eingeben.");
      return false;
    }
    if (numericAmount > availableBalance) {
      setMessage("Der verfügbare Kontostand reicht nicht aus.");
      return false;
    }
    return true;
  }

  function selectSuggestion(suggestion: {
    customerId: string;
    displayName: string;
  }) {
    setRecipientInput(suggestion.customerId);
    setResolvedCustomerId(suggestion.customerId);
    setResolvedRecipient(suggestion.displayName);
    setSuggestions([]);
    setMessage("");
  }

  function goToPinStep() {
    if (!resolvedCustomerId || !validateAmountInput()) {
      setMessage("Bitte alle Felder korrekt ausfüllen.");
      return;
    }
    setStep(4);
  }

  function goToReview() {
    if (!validateAmountInput()) return;
    if (!resolvedCustomerId) {
      setMessage("Bitte gib einen gültigen Empfänger an.");
      return;
    }
    setStep(3);
  }

  function goToNote() {
    if (!validateAmountInput()) return;
    if (!resolvedCustomerId) {
      setMessage("Bitte gib einen gültigen Empfänger an.");
      return;
    }
    setStep(2);
  }

  function handleDigitInput(digit: string) {
    setPin((currentPin) =>
      currentPin.length >= PIN_LENGTH ? currentPin : `${currentPin}${digit}`,
    );
  }

  function handleBackspace() {
    setPin((currentPin) => currentPin.slice(0, -1));
  }

  function handleAppendAmount(digits: string) {
    setAmountCents((current) => appendDigits(current, digits, MAX_DIGITS));
  }

  function handleBackspaceAmount() {
    setAmountCents((current) => removeLastDigit(current));
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
          amount: numericAmount,
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
      setAmountCents("");
      setDescription("");
      setPin("");
      setStep(0);
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

  if (step === 4) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-label-sm text-label-sm text-primary">
              Schritt 5 · Bestätigen
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
              setStep(3);
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
            {formattedTransferAmount}
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
          {isSubmitting ? "Überweisung wird geprüft..." : "Überweisung bestätigen"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Stepper steps={STEP_LABELS} current={step} />

      {step === 0 ? (
        <div className="space-y-6">
          <div className="flex items-stretch justify-center gap-2 rounded-2xl bg-surface-container p-1">
            {(["EUR", "AIR"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm font-semibold transition-all",
                  currency === c
                    ? "bg-primary-container text-white glow-effect"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="text-center">
            <p className="text-sm text-on-surface-variant">Betrag</p>
            <p className="font-balance-display text-balance-display mt-2 break-words text-on-surface">
              {amountCents === "" ? "0,00 €" : enteredAmountLabel}
            </p>
            <button
              type="button"
              onClick={() => setAmountCents(String(availableBalance))}
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-sm text-primary transition hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-base">account_balance_wallet</span>
              <span className="font-medium">{availableBalanceLabel}</span>
            </button>
          </div>

          <p className="text-center text-xs text-on-surface-variant">
            {amountCents === "" ? "Tippe den Betrag ein" : "Tippe, um zu zahlen"}
          </p>

          <NumericKeypad
            onAppend={handleAppendAmount}
            onBackspace={handleBackspaceAmount}
          />

          {message ? <p className="text-center text-sm text-error">{message}</p> : null}

          <Button
            className="w-full"
            disabled={!isAmountValid || numericAmount > availableBalance}
            onClick={() => {
              if (validateAmountInput()) setStep(1);
            }}
            type="button"
          >
            Weiter
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Wem willst du überweisen?
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Gib die {currency}-Summe deines Gegenübers ein.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">
              Empfänger-Kundennummer oder E-Mail
            </label>
            <Input
              autoFocus
              inputMode="email"
              onChange={(event) => setRecipientInput(event.target.value)}
              onFocus={() => {
                if (recipientInput.trim().length >= 2) setSuggestions([]);
              }}
              placeholder="Name, Kundennummer oder E-Mail"
              value={recipientInput}
            />
            {suggestions.length > 0 ? (
              <div className="glass-card max-h-56 overflow-y-auto rounded-xl p-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.customerId}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-container"
                  >
                    <span className="glass-card flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      <span className="material-symbols-outlined text-base text-primary">
                        person
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-on-surface">
                        {suggestion.displayName}
                      </span>
                      <span className="block font-label-sm text-label-sm text-on-surface-variant">
                        {suggestion.customerId}
                      </span>
                    </span>
                    <span className="material-symbols-outlined text-base text-on-surface-variant">
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
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
                "Name, Kundennummer oder E-Mail-Adresse eingeben"
              )}
            </p>
          </div>

          {message ? <p className="text-sm text-error">{message}</p> : null}

          <div className="flex flex-col gap-3">
            <Button
              className="w-full"
              disabled={isResolvingRecipient || !resolvedCustomerId}
              onClick={goToNote}
              type="button"
            >
              Weiter
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                setMessage("");
                setStep(0);
              }}
              type="button"
              variant="outline"
            >
              Zurück
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Möchtest du etwas dazuschreiben?
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Optionaler Verwendungszweck.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">
              Notiz (optional)
            </label>
            <Input
              maxLength={120}
              onChange={(event) => setDescription(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  goToReview();
                }
              }}
              placeholder="Lunch, Geschenk, Rückzahlung"
              value={description}
            />
            <p className="text-right text-xs text-on-surface-variant">
              {description.length}/120
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button className="w-full" onClick={goToReview} type="button">
              Weiter
            </Button>
            <Button
              className="w-full"
              onClick={() => setStep(1)}
              type="button"
              variant="outline"
            >
              Zurück
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Alles korrekt?
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Bitte überprüfe deine Angaben.
            </p>
          </div>

          <div className="glass-card divide-y divide-white/5 overflow-hidden rounded-2xl">
            <ReviewRow
              icon="payments"
              label="Betrag"
              value={`${formattedTransferAmount} · ${currency}`}
              onEdit={() => setStep(0)}
            />
            <ReviewRow
              icon="person"
              label="Empfänger"
              value={resolvedRecipient || recipientInput}
              onEdit={() => setStep(1)}
            />
            <ReviewRow
              icon="sticky_note_2"
              label="Notiz"
              value={description.trim() || "—"}
              onEdit={() => setStep(2)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Button className="w-full" onClick={goToPinStep} type="button">
              Weiter zur PIN
            </Button>
            <Button
              className="w-full"
              onClick={() => setStep(2)}
              type="button"
              variant="outline"
            >
              Zurück
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReviewRow({
  icon,
  label,
  value,
  onEdit,
}: {
  icon: string;
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4">
      <span className="material-symbols-outlined text-on-surface-variant">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="truncate font-semibold text-on-surface">{value}</p>
      </div>
      <button onClick={onEdit} type="button" className="shrink-0">
        <span className="material-symbols-outlined text-on-surface-variant hover:text-primary">
          edit
        </span>
      </button>
    </div>
  );
}
