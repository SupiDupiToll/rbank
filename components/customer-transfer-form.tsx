"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type CustomerTransferFormProps = {
  balanceCents: number;
};

const PIN_LENGTH = 4;
const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function CustomerTransferForm({
  balanceCents,
}: CustomerTransferFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "pin">("form");
  const [recipientCustomerId, setRecipientCustomerId] = useState("");
  const [resolvedRecipient, setResolvedRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [isResolvingRecipient, setIsResolvingRecipient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);

  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  const isAmountValid = Number.isInteger(amountCents) && amountCents > 0;

  useEffect(() => {
    const normalizedCustomerId = recipientCustomerId.trim();

    setResolvedRecipient("");
    setMessage("");

    if (!/^\d{8}$/.test(normalizedCustomerId)) {
      return;
    }

    const controller = new AbortController();

    async function resolveRecipient() {
      setIsResolvingRecipient(true);

      try {
        const response = await fetch(
          `/api/customer/resolve/${normalizedCustomerId}`,
          {
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as {
          displayName?: string;
          error?: string;
        };

        if (!response.ok) {
          setMessage(data.error ?? "Empfänger konnte nicht geprüft werden.");
          return;
        }

        setResolvedRecipient(data.displayName ?? "");
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
  }, [recipientCustomerId]);

  function goToPinStep() {
    if (
      !/^\d{8}$/.test(recipientCustomerId.trim()) ||
      !isAmountValid ||
      !description.trim()
    ) {
      setMessage("Bitte alle Felder korrekt ausfüllen.");
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
          recipientCustomerId: recipientCustomerId.trim(),
          amount: amountCents,
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
      setRecipientCustomerId("");
      setResolvedRecipient("");
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
        <div className="rounded-3xl border border-green-500/20 bg-green-500/5 p-6">
          <p className="text-sm font-semibold text-green-300">
            Überweisung erfolgreich ausgeführt.
          </p>
        </div>
        <Button
          className="w-full rounded-xl"
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
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Schritt 2
            </p>
            <h3 className="mt-2 text-2xl font-display text-slate-100">
              PIN eingeben
            </h3>
            <p className="mt-2 text-sm text-slate-300">
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

        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm text-slate-300">Betrag</p>
          <p className="mt-2 text-3xl font-display text-primary">
            {isAmountValid ? formatEuroFromCents(amountCents) : "0,00 €"}
          </p>
          <p className="mt-4 text-sm text-slate-400">Empfänger</p>
          <p className="mt-1 font-semibold text-slate-100">
            {resolvedRecipient || recipientCustomerId}
          </p>
          {description.trim() ? (
            <>
              <p className="mt-3 text-sm text-slate-400">Verwendungszweck</p>
              <p className="mt-1 font-semibold text-slate-100">
                {description.trim()}
              </p>
            </>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-200">Deine PIN</p>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: PIN_LENGTH }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className={cn(
                  "flex h-16 items-center justify-center rounded-2xl border text-3xl",
                  index < pin.length
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-slate-800 bg-slate-900/70 text-slate-500",
                )}
              >
                {index < pin.length ? "*" : ""}
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
            className="h-16 rounded-2xl text-lg"
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

        {message ? <p className="text-sm text-red-300">{message}</p> : null}

        <Button
          className="w-full rounded-xl"
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
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-200">
        Verfügbarer Kontostand:{" "}
        <span className="font-bold text-primary">
          {formatEuroFromCents(balanceCents)}
        </span>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-200">
          Empfänger-Kundennummer
        </label>
        <Input
          inputMode="numeric"
          maxLength={8}
          onChange={(event) =>
            setRecipientCustomerId(event.target.value.replace(/\D/g, ""))
          }
          placeholder="47291836"
          value={recipientCustomerId}
        />
        <p className="min-h-5 text-xs text-slate-400">
          {isResolvingRecipient
            ? "Empfänger wird geprüft..."
            : resolvedRecipient
              ? `Empfänger: ${resolvedRecipient}`
              : "8-stellige Kundennummer eingeben"}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-200">
          Betrag in EUR
        </label>
        <Input
          inputMode="decimal"
          onChange={(event) => setAmount(event.target.value)}
          placeholder="25,00"
          value={amount}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-200">
          Verwendungszweck
        </label>
        <Input
          maxLength={120}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Lunch, Geschenk, Rückzahlung"
          value={description}
        />
      </div>

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      <Button
        className="w-full rounded-xl"
        disabled={isSubmitting || isResolvingRecipient || !resolvedRecipient}
        type="submit"
      >
        Weiter zur PIN
      </Button>
    </form>
  );
}
