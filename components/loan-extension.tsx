"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ExtensionStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

type ExtensionDto = {
  id: string;
  status: ExtensionStatus;
  requestedTermMonths: number;
  reason: string | null;
  oldTermMonths: number;
  newTermMonths: number | null;
  newInterestRate: number | null;
  newOneTimeFeeCents: number | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type LoanExtensionProps = {
  loanId: string;
  remainingAmount: number;
  termMonths: number;
  interestRate: number;
  paidCount: number;
};

const statusLabels: Record<ExtensionStatus, string> = {
  PENDING: "Ausstehend",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
  CANCELLED: "Storniert",
};

export function LoanExtensionForm({
  loanId,
  remainingAmount,
  termMonths,
  interestRate,
  paidCount,
}: LoanExtensionProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [termInput, setTermInput] = useState(String(Math.max(termMonths, paidCount + 1)));
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [extensions, setExtensions] = useState<ExtensionDto[]>([]);

  const loadExtensions = useCallback(async () => {
    try {
      const res = await fetch(`/api/customer/loans/${loanId}/extend`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { extensions: ExtensionDto[] };
      setExtensions(data.extensions);
    } catch {
      // ignore
    }
  }, [loanId]);

  useEffect(() => {
    void loadExtensions();
  }, [loadExtensions]);

  const activeRequest = useMemo(
    () => extensions.find((e) => e.status === "PENDING") ?? null,
    [extensions],
  );
  const latestResolved = useMemo(
    () => extensions.find((e) => e.status !== "PENDING") ?? null,
    [extensions],
  );

  const term = Math.round(Number(termInput));
  const newMonthlyPayment = useMemo(() => {
    if (!(term > paidCount) || remainingAmount <= 0) return null;
    const r = interestRate / 100 / 12;
    if (r === 0) return Math.round(remainingAmount / term);
    const factor = Math.pow(1 + r, term);
    return Math.round((remainingAmount * (r * factor)) / (factor - 1));
  }, [term, paidCount, remainingAmount, interestRate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const res = await fetch(`/api/customer/loans/${loanId}/extend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
      body: JSON.stringify({ termMonths: term, reason: reason || undefined }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Anfrage konnte nicht gesendet werden.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setExpanded(false);
    setMessage("Antrag gesendet! Der Admin wird ihn prüfen.");
    setReason("");
    await loadExtensions();
    router.refresh();
  }

  const minTerm = paidCount + 1;

  if (activeRequest) {
    return (
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border-tertiary/40 p-5">
        <div className="text-sm">
          <p className="font-bold text-on-surface">
            Verlängerungsantrag: {statusLabels.PENDING}
          </p>
          <p className="mt-1 text-on-surface-variant">
            Gewuenschte Laufzeit: {activeRequest.requestedTermMonths} Monate. Der Antrag wird
            gerade von einem Admin geprueft.
          </p>
        </div>
        <span className="rounded-full bg-tertiary-container/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-tertiary">
          Wird geprueft
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {latestResolved && latestResolved.status === "APPROVED" ? (
        <div className="glass-card rounded-2xl border-tertiary/30 p-4 text-sm text-on-surface-variant">
          Zuletzt wurde die Laufzeit auf {latestResolved.requestedTermMonths} Monate verlaengert.
        </div>
      ) : null}

      {latestResolved && latestResolved.status === "REJECTED" ? (
        <div className="glass-card rounded-2xl border-error/30 p-4 text-sm text-on-surface-variant">
          Der letzte Verlaengerungsantrag wurde abgelehnt.
          {latestResolved.rejectionReason ? ` Grund: ${latestResolved.rejectionReason}` : ""}
        </div>
      ) : null}

      {!expanded ? (
        <Button variant="outline" onClick={() => setExpanded(true)}>
          Laufzeit verlaengern
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl border-tertiary/30 p-5">
          <div>
            <p className="font-bold text-on-surface">Laufzeit verlaengern</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Strecke den Restbetrag ueber mehr Monate, um die monatliche Rate zu senken.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Neue Laufzeit (Monate)</Label>
              <Input
                required
                type="number"
                min={minTerm}
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
              />
              <p className="text-xs text-on-surface-variant">Mindestens {minTerm} Monate</p>
            </div>
            <div className="space-y-2">
              <Label>Grund (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="z.B. finanzieller Engpass"
              />
            </div>
          </div>

          {newMonthlyPayment && newMonthlyPayment > 0 ? (
            <div className="mesh-gradient rounded-2xl p-4">
              <p className="text-sm text-on-surface">
                Voraussichtliche neue Monatsrate:{" "}
                <span className="font-bold">{(newMonthlyPayment / 100).toFixed(2)} EUR</span>
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Hinweis: Der Admin kann Zinssatz und Einmalgebuehr bei der Freigabe anpassen.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Wird gesendet..." : "Antrag senden"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setExpanded(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
