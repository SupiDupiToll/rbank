"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatEuroFromCents } from "@/lib/money";

type Props = {
  slug: string;
  name: string;
  ownerName: string;
  success: boolean;
};

export function PublicDonationBox({
  slug,
  name,
  ownerName,
  success,
}: Props) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  const isAmountValid = Number.isFinite(amountCents) && amountCents > 0;

  async function handleSubmit() {
    if (!isAmountValid) {
      setMessage("Bitte einen gueltigen Betrag eingeben.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/donation-boxes/${slug}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountCents,
          description: description.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        paymentUrl?: string;
      };

      if (!response.ok || !data.paymentUrl) {
        setMessage(data.error ?? "Spendenlink konnte nicht gestartet werden.");
        return;
      }

      window.location.href = data.paymentUrl;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-10 sm:px-6">
      <header className="rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-slate-950 to-slate-950 px-6 py-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
          RBank Spendenbox
        </p>
        <h1 className="mt-3 text-4xl font-display text-slate-100">{name}</h1>
        <p className="mt-3 text-base text-slate-300">
          Unterstuetze {ownerName} direkt mit deinem RBank-Konto.
        </p>
      </header>

      {success ? (
        <Card className="border border-green-500/20 bg-green-500/10">
          <p className="text-sm font-semibold text-green-200">
            Die Spende wurde gestartet. Wenn die Zahlung erfolgreich war, wurde
            der Betrag direkt gutgeschrieben.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-5 rounded-[2rem] border border-slate-800/70 bg-slate-950/80">
        <div>
          <p className="text-sm text-slate-400">Betrag</p>
          <Input
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="10,00"
            value={amount}
          />
          <p className="mt-2 text-sm text-slate-400">
            {isAmountValid ? formatEuroFromCents(amountCents) : "0,00 €"}
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-400">Nachricht optional</p>
          <Input
            maxLength={120}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={`Spende fuer ${name}`}
            value={description}
          />
        </div>

        {message ? <p className="text-sm text-rose-300">{message}</p> : null}

        <Button
          className="h-14 w-full rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"
          disabled={!isAmountValid || isSubmitting}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {isSubmitting ? "Leitet weiter..." : "Mit RBank spenden"}
        </Button>
      </Card>
    </div>
  );
}
