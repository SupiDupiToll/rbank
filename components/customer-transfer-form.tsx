"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";

type CustomerTransferFormProps = {
  balanceCents: number;
};

export function CustomerTransferForm({ balanceCents }: CustomerTransferFormProps) {
  const router = useRouter();
  const [recipientCustomerId, setRecipientCustomerId] = useState("");
  const [resolvedRecipient, setResolvedRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [isResolvingRecipient, setIsResolvingRecipient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const response = await fetch(`/api/customer/resolve/${normalizedCustomerId}`, {
          signal: controller.signal
        });
        const data = (await response.json()) as { displayName?: string; error?: string };

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!/^\d{8}$/.test(recipientCustomerId) || Number.isNaN(amountCents) || amountCents <= 0 || !description.trim()) {
      setMessage("Bitte alle Felder korrekt ausfüllen.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/customer/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie()
        },
        body: JSON.stringify({
          recipientCustomerId,
          amount: amountCents,
          description: description.trim()
        })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Überweisung konnte nicht ausgeführt werden.");
        return;
      }

      setMessage("Überweisung erfolgreich ausgeführt.");
      setRecipientCustomerId("");
      setResolvedRecipient("");
      setAmount("");
      setDescription("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-200">
        Verfügbarer Kontostand: <span className="font-bold text-primary">{formatEuroFromCents(balanceCents)}</span>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-200">Empfänger-Kundennummer</label>
        <Input
          inputMode="numeric"
          maxLength={8}
          onChange={(event) => setRecipientCustomerId(event.target.value.replace(/\D/g, ""))}
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
        <label className="text-sm font-semibold text-slate-200">Betrag in EUR</label>
        <Input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} placeholder="25,00" value={amount} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-200">Verwendungszweck</label>
        <Input
          maxLength={120}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Lunch, Geschenk, Rückzahlung"
          value={description}
        />
      </div>

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      <Button className="w-full rounded-xl" disabled={isSubmitting || isResolvingRecipient || !resolvedRecipient} type="submit">
        {isSubmitting ? "Überweisung läuft..." : "Überweisung senden"}
      </Button>
    </form>
  );
}
