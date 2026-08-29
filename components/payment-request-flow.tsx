"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  appendDigits,
  NumericKeypad,
  removeLastDigit,
} from "@/components/ui/numeric-keypad";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type PaymentRequestFlowProps = {
  /** Modus Zahlungslink: eingeloggter Nutzer ist Empfänger, diese Person zahlt. */
  payerUserId?: string;
  /** Modus QR-Scan: eingeloggter Nutzer ist Zahler, diese Person empfängt. */
  recipientUserId?: string;
  recipientEmail: string;
  returnUrl: string;
  /** Wird aufgerufen, wenn das Popup geschlossen werden soll (statt Navigation). */
  onClose?: () => void;
};

const PIN_LENGTH = 4;
const MAX_DIGITS = 9;
const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function PaymentRequestFlow({
  payerUserId,
  recipientUserId,
  recipientEmail,
  returnUrl,
  onClose,
}: PaymentRequestFlowProps) {
  const isScanMode = Boolean(recipientUserId);
  const [amountInput, setAmountInput] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [step, setStep] = useState<"amount" | "pin">("amount");

  const amountCents = amountInput === "" ? 0 : Number(amountInput);
  const isAmountValid = amountCents > 0;

  function handleAmountAppend(digits: string) {
    setMessage("");
    setAmountInput((current) => appendDigits(current, digits, MAX_DIGITS));
  }

  function handleAmountBackspace() {
    setMessage("");
    setAmountInput((current) => removeLastDigit(current));
  }

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

  function closeOrGoBack() {
    if (onClose) {
      onClose();
      return;
    }
    window.location.href = returnUrl;
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
          ...(payerUserId ? { payerUserId } : {}),
          ...(recipientUserId ? { recipientUserId } : {}),
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
          {isScanMode
            ? `${formatEuroFromCents(amountCents)} wurde an ${recipientEmail} überwiesen.`
            : `${formatEuroFromCents(amountCents)} wurde dem angegebenen Konto belastet und ${recipientEmail} gutgeschrieben.`}
        </p>
        <Button
          className="h-14 w-full"
          onClick={closeOrGoBack}
          type="button"
        >
          Fertig
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {step === "amount" ? (
        <Card className="space-y-6">
          <div>
            <p className="font-label-sm text-label-sm text-primary">Schritt 1</p>
            <h1 className="font-headline-md text-headline-md mt-3 text-on-surface">
              Betrag eingeben
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              {isScanMode
                ? `Lege zuerst fest, wie viel an ${recipientEmail} gezahlt werden soll.`
                : `Lege zuerst fest, wie viel an ${recipientEmail} gesendet werden soll.`}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-on-surface-variant">Betrag</p>
            <p className="font-balance-display text-balance-display mt-2 break-words text-on-surface">
              {amountCents === 0 ? "0,00 €" : formatEuroFromCents(amountCents)}
            </p>
          </div>

          <NumericKeypad
            onAppend={handleAmountAppend}
            onBackspace={handleAmountBackspace}
          />

          {message ? <p className="text-sm text-error">{message}</p> : null}

          <div className="flex flex-col gap-3">
            <Button
              className="h-14 w-full text-sm"
              disabled={!isAmountValid}
              onClick={goToPinStep}
              type="button"
            >
              Weiter zur PIN
            </Button>
            <Button
              className="w-full"
              onClick={closeOrGoBack}
              type="button"
              variant="outline"
            >
              Abbrechen
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-label-sm text-label-sm text-primary">
                Schritt 2
              </p>
              <h2 className="font-headline-md text-headline-md mt-3 text-on-surface">
                PIN eingeben
              </h2>
            </div>
            <Button
              onClick={() => {
                setMessage("");
                setStep("amount");
              }}
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
