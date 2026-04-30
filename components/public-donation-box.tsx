"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";

type Props = {
  slug: string;
  name: string;
  isAuthenticated: boolean;
  success: boolean;
};

export function PublicDonationBox({
  slug,
  name,
  isAuthenticated,
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
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
        },
        body: JSON.stringify({
          amount: amountCents,
          description: description.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        loginRequired?: boolean;
        paymentUrl?: string;
      };

      if (response.status === 401 && data.loginRequired) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/spendenbox/${slug}`)}`;
        return;
      }

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
    <div className="mx-auto max-w-xl space-y-8 px-4 py-10 sm:px-6">
      <header className="relative overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900/40 px-6 py-10 sm:px-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/20" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative z-10">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
          RBank Spendenbox
          </p>
          <h1 className="mt-4 text-5xl font-display font-black leading-[1.1] tracking-tight text-slate-100 sm:text-6xl">
            {name}
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-400">
            Spende direkt ueber diese Spendenbox mit deinem RBank-Konto und
            bestaetige die Zahlung spaeter sicher mit deiner PIN.
          </p>
        </div>
      </header>

      {success ? (
        <Card className="rounded-xl border border-primary/20 bg-primary/10 p-6">
          <p className="text-sm font-semibold text-green-200">
            Die Spende wurde gestartet. Wenn die Zahlung erfolgreich war, wurde
            der Betrag direkt gutgeschrieben.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-6 rounded-xl border border-slate-800/50 bg-slate-900/40 p-6 sm:p-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Beitrag
          </p>
          <Input
            className="mt-3"
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="10,00"
            value={amount}
          />
          <p className="mt-3 text-lg text-slate-400">
            {isAmountValid ? formatEuroFromCents(amountCents) : "0,00 €"}
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">
            Nachricht optional
          </p>
          <Input
            maxLength={120}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={`Spende fuer ${name}`}
            value={description}
          />
        </div>

        {message ? <p className="text-sm text-rose-300">{message}</p> : null}

        {isAuthenticated ? (
          <Button
            className="h-14 w-full rounded-full bg-primary text-background-dark text-lg font-bold"
            disabled={!isAmountValid || isSubmitting}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isSubmitting ? "Leitet weiter..." : "Mit RBank spenden"}
          </Button>
        ) : (
          <Button asChild className="h-14 w-full rounded-full text-lg font-bold">
            <Link href={`/login?redirect=${encodeURIComponent(`/spendenbox/${slug}`)}`}>
              Mit RBank anmelden
            </Link>
          </Button>
        )}
      </Card>
    </div>
  );
}
