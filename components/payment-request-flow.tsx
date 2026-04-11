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
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Abschluss
          </p>
          <h1 className="mt-3 text-3xl font-display text-slate-100">
            Zahlung erfolgreich
          </h1>
        </div>
        <p className="text-slate-300">
          {formatEuroFromCents(amountCents)} wurde dem angegebenen Konto
          belastet und {recipientEmail} gutgeschrieben.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={returnUrl as Route}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-background-dark transition-colors hover:bg-primary/80"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            Zurück
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
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
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Schritt 1
            </p>
            <h1 className="mt-3 text-3xl font-display text-slate-100">
              Betrag eingeben
            </h1>
            <p className="mt-3 text-slate-300">
              Lege zuerst fest, wie viel an {recipientEmail} gesendet werden
              soll.
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

          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm text-slate-300">Vorschau</p>
            <p className="mt-2 text-4xl font-display text-primary">
              {isAmountValid ? formatEuroFromCents(amountCents) : "0,00 €"}
            </p>
          </div>

          {message ? <p className="text-sm text-red-300">{message}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1 rounded-xl"
              onClick={goToPinStep}
              type="button"
            >
              Weiter zur PIN
            </Button>
            <Link
              href={returnUrl as Route}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
              Zum Dashboard
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                Schritt 2
              </p>
              <h2 className="mt-3 text-3xl font-display text-slate-100">
                PIN eingeben
              </h2>
              <p className="mt-3 text-slate-300">
                Bestaetige die Zahlung mit der 4-stelligen PIN des zahlenden
                Nutzers.
              </p>
            </div>
            <Button
              onClick={() => setStep("amount")}
              type="button"
              variant="outline"
            >
              Zurück
            </Button>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm text-slate-300">Betrag</p>
            <p className="mt-2 text-4xl font-display text-primary">
              {formatEuroFromCents(amountCents)}
            </p>
            <p className="mt-4 text-sm text-slate-400">Empfänger</p>
            <p className="mt-1 font-semibold text-slate-100">
              {recipientEmail}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-200">
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
              onClick={handleConfirm}
              type="button"
            >
              OK
            </Button>
          </div>

          {message ? <p className="text-sm text-red-300">{message}</p> : null}

          <Button
            className="w-full rounded-xl"
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
