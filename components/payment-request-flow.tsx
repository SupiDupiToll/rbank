"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";

type PaymentRequestFlowProps = {
  payerUserId: string;
  recipientEmail: string;
};

export function PaymentRequestFlow({ payerUserId, recipientEmail }: PaymentRequestFlowProps) {
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);

  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  const isAmountValid = Number.isInteger(amountCents) && amountCents > 0;

  async function handleConfirm() {
    if (!isAmountValid) {
      setMessage("Bitte einen gueltigen Betrag eingeben.");
      return;
    }

    if (pin.length !== 4) {
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
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie()
        },
        body: JSON.stringify({
          payerUserId,
          amount: amountCents,
          pin
        })
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
      <Card className="max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Abschluss</p>
        <h1 className="mt-3 text-3xl font-display text-slate-100">Zahlung erfolgreich</h1>
        <p className="mt-4 text-slate-300">
          {formatEuroFromCents(amountCents)} wurde dem angegebenen Konto belastet und {recipientEmail} gutgeschrieben.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Schritt 2</p>
        <h1 className="mt-3 text-3xl font-display text-slate-100">Betrag eingeben</h1>
        <div className="mt-8 space-y-2">
          <label className="text-sm font-semibold text-slate-200">Betrag in EUR</label>
          <Input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} placeholder="25,00" value={amount} />
        </div>
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Schritt 3</p>
        <h2 className="mt-3 text-2xl font-display text-slate-100">Bestätigung</h2>

        <div className="mt-6 rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm text-slate-300">Betrag</p>
          <p className="mt-2 text-4xl font-display text-primary">
            {isAmountValid ? formatEuroFromCents(amountCents) : "0,00 €"}
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-sm text-slate-400">Empfänger</p>
            <p className="mt-1 font-semibold text-slate-100">{recipientEmail}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200">PIN des zahlenden Nutzers</label>
            <Input
              autoComplete="off"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              placeholder="1234"
              value={pin}
            />
          </div>
        </div>

        {message ? <p className="mt-4 text-sm text-red-300">{message}</p> : null}

        <Button className="mt-6 w-full rounded-xl" disabled={isSubmitting} onClick={handleConfirm} type="button">
          {isSubmitting ? "Zahlung wird geprueft..." : "Zahlung bestaetigen"}
        </Button>
      </Card>
    </div>
  );
}
