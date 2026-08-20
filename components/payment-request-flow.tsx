"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type PaymentRequestFlowProps = {
  payerUserId: string;
  recipientEmail: string;
  returnUrl: string;
};

const PIN_LENGTH = 4;
const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function PaymentRequestFlow({
  payerUserId,
  recipientEmail,
  returnUrl,
}: PaymentRequestFlowProps) {
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [step, setStep] = useState<"amount" | "pin">("amount");

  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  const isAmountValid = Number.isInteger(amountCents) && amountCents > 0;

  function goToPinStep() {
    if (!isAmountValid) {
      setMessage("Bitte einen gueltigen Betrag eingeben.");
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

  async function handleConfirm() {
    if (!isAmountValid) {
      setMessage("Bitte einen gueltigen Betrag eingeben.");
      return;
    }

    if (pin.length !== PIN_LENGTH) {
      setMessage("Bitte die 4-stellige PIN eingeben.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
        },
        body: JSON.stringify({
          payerUserId,
          amount: amountCents,
          pin,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Zahlung konnte nicht ausgefuehrt werden.");
        return;
      }

      setIsSuccessful(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccessful) {
    return (
      <Card className="max-w-xl space-y-6">
        <div>
          <p className="font-label-sm text-label-sm text-primary">Abschluss</p>
          <h1 className="font-headline-md text-headline-md mt-3 text-on-surface">
            Zahlung erfolgreich
          </h1>
        </div>
        <div className="glass-card mesh-gradient flex h-16 w-16 items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-primary">
            check_circle
          </span>
        </div>
        <p className="text-on-surface-variant">
          {formatEuroFromCents(amountCents)} wurde dem angegebenen Konto
          belastet und {recipientEmail} gutgeschrieben.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={returnUrl as Route}
            className="bg-primary-container glow-effect flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white transition-colors hover:opacity-90 sm:w-auto"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Zurück
          </Link>
          <Link
            href="/dashboard"
            className="glass-card flex h-14 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container sm:w-auto"
          >
            Zum Dashboard
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {step === "amount" ? (
        <Card className="space-y-8">
          <div>
            <p className="font-label-sm text-label-sm text-primary">Schritt 1</p>
            <h1 className="font-headline-md text-headline-md mt-3 text-on-surface">
              Betrag eingeben
            </h1>
            <p className="mt-3 text-on-surface-variant">
              Lege zuerst fest, wie viel an {recipientEmail} gesendet werden
              soll.
            </p>
          </div>

          <div className="space-y-2">
            <label className="font-label-sm text-label-sm text-on-surface">
              Betrag in EUR
            </label>
            <Input
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="25,00"
              value={amount}
            />
          </div>

          <div className="glass-card mesh-gradient rounded-xl p-5">
            <p className="text-sm text-on-surface-variant">Vorschau</p>
            <p className="font-balance-display text-balance-display mt-2 text-primary">
              {isAmountValid ? formatEuroFromCents(amountCents) : "0,00 €"}
            </p>
          </div>

          {message ? <p className="text-sm text-error">{message}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-14 w-full text-sm sm:w-auto sm:flex-1"
              onClick={goToPinStep}
              type="button"
            >
              Weiter zur PIN
            </Button>
            <Link
              href={returnUrl as Route}
              className="glass-card flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container sm:w-auto"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Zum Dashboard
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-label-sm text-label-sm text-primary">Schritt 2</p>
              <h2 className="font-headline-md text-headline-md mt-3 text-on-surface">
                PIN eingeben
              </h2>
            </div>
            <Button
              onClick={() => setStep("amount")}
              type="button"
              variant="outline"
            >
              Zurück
            </Button>
          </div>

          <div className="glass-card mesh-gradient rounded-xl p-5">
            <p className="text-sm text-on-surface-variant">Betrag</p>
            <p className="font-balance-display text-balance-display mt-2 text-primary">
              {formatEuroFromCents(amountCents)}
            </p>
            <p className="mt-4 text-sm text-on-surface-variant">Empfänger</p>
            <p className="mt-1 font-semibold text-on-surface">
              {recipientEmail}
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-label-sm text-label-sm text-on-surface">
              PIN des zahlenden Nutzers
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
                      : "border-white/10 bg-surface-container-high/70 text-on-surface-variant",
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
              onClick={handleConfirm}
              type="button"
            >
              OK
            </Button>
          </div>

          {message ? <p className="text-sm text-error">{message}</p> : null}

          <Button
            className="w-full"
            disabled={isSubmitting || pin.length !== PIN_LENGTH}
            onClick={handleConfirm}
            type="button"
          >
            {isSubmitting ? "Zahlung wird geprueft..." : "Zahlung bestaetigen"}
          </Button>
        </Card>
      )}
    </div>
  );
}
