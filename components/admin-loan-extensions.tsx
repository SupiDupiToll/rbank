"use client";

import { useCallback, useEffect, useState } from "react";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

type PendingExtension = {
  id: string;
  status: string;
  reason: string | null;
  requestedTermMonths: number;
  oldTermMonths: number;
  oldInterestRate: number;
  oldOneTimeFeeCents: number | null;
  createdAt: string;
  loan: {
    id: string;
    amount: number;
    interestRate: number;
    remainingAmount: number;
    oneTimeFeeCents: number | null;
    termMonths: number;
    monthlyPayment: number;
    paidInstallments: number;
    user: {
      customerId: string;
      displayName: string | null;
      stackUserId: string;
    };
  };
};

function calculateMonthlyPayment(amount: number, annualRate: number, termMonths: number) {
  if (amount <= 0 || termMonths <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.round(amount / termMonths);
  const factor = Math.pow(1 + r, termMonths);
  return Math.round((amount * (r * factor)) / (factor - 1));
}

export function AdminLoanExtensions() {
  const router = useRouter();
  const [extensions, setExtensions] = useState<PendingExtension[]>([]);
  const [loading, setLoading] = useState(false);

  const [termInputs, setTermInputs] = useState<Record<string, string>>({});
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});
  const [feeInputs, setFeeInputs] = useState<Record<string, string>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/loans/extensions");
    if (!res.ok) return;
    const data = (await res.json()) as { extensions: PendingExtension[] };
    const pending = data.extensions.filter((e) => e.status === "PENDING");
    setExtensions(pending);
    setTermInputs((prev) => {
      const next = { ...prev };
      for (const e of pending) {
        if (!next[e.id]) next[e.id] = String(e.requestedTermMonths);
      }
      return next;
    });
    setRateInputs((prev) => {
      const next = { ...prev };
      for (const e of pending) {
        if (!next[e.id]) next[e.id] = String(e.loan.interestRate);
      }
      return next;
    });
    setFeeInputs((prev) => {
      const next = { ...prev };
      for (const e of pending) {
        if (!next[e.id]) next[e.id] = String((e.loan.oneTimeFeeCents ?? 0) / 100);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(ext: PendingExtension) {
    const termMonths = Number(termInputs[ext.id]);
    const interestRate = Number(rateInputs[ext.id]);
    const oneTimeFee = Number(feeInputs[ext.id]);
    if (!(termMonths > 0) || isNaN(interestRate) || isNaN(oneTimeFee)) {
      toast("Bitte gueltige Werte eingeben.", "error");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/admin/loans/extensions/${ext.id}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
      body: JSON.stringify({ termMonths, interestRate, oneTimeFeeCents: Math.round(oneTimeFee * 100) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast(data.error ?? "Fehler bei Freigabe.", "error");
      return;
    }
    toast("Verlaengerung genehmigt.", "success");
    await load();
    router.refresh();
  }

  async function reject(ext: PendingExtension) {
    if (!window.confirm("Antrag wirklich ablehnen?")) return;
    setLoading(true);
    const res = await fetch(`/api/admin/loans/extensions/${ext.id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
      body: JSON.stringify({ reason: rejectReasons[ext.id] || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast(data.error ?? "Fehler bei Ablehnung.", "error");
      return;
    }
    toast("Antrag abgelehnt.", "success");
    await load();
    router.refresh();
  }

  return (
    <Card className="space-y-4 p-6">
      <div>
        <h3 className="text-2xl font-bold text-on-surface">Laufzeitverlaengerungen</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Offene Antraege zur Verlaengerung von Kreditlaufzeiten.
        </p>
      </div>

      {extensions.length === 0 ? (
        <p className="py-4 text-sm text-on-surface-variant">Keine offenen Antraege.</p>
      ) : (
        <div className="space-y-4">
          {extensions.map((ext) => {
            const newTerm = Number(termInputs[ext.id] ?? ext.requestedTermMonths);
            const newRate = Number(rateInputs[ext.id] ?? ext.loan.interestRate);
            const newFee = Number(feeInputs[ext.id] ?? 0);
            const newMonthly = calculateMonthlyPayment(ext.loan.remainingAmount, newRate, newTerm);
            return (
              <div key={ext.id} className="rounded-2xl border border-white/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-on-surface">
                      {ext.loan.user.displayName ?? "Kunde"}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      #{ext.loan.user.customerId} · {ext.loan.user.stackUserId}
                    </p>
                  </div>
                  <span className="rounded-full bg-tertiary-container/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-tertiary">
                    {ext.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                      Kreditbetrag
                    </p>
                    <p className="text-on-surface">
                      {formatEuroFromCents(ext.loan.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                      Restbetrag
                    </p>
                    <p className="text-on-surface">
                      {formatEuroFromCents(ext.loan.remainingAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                      Bezahlt
                    </p>
                    <p className="text-on-surface">{ext.loan.paidInstallments} Raten</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-surface-container/20 p-4">
                  <p className="mb-3 text-sm font-bold text-on-surface">Neue Konditionen</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Laufzeit (Monate)</Label>
                      <Input
                        type="number"
                        min={ext.loan.paidInstallments + 1}
                        value={termInputs[ext.id] ?? ext.requestedTermMonths}
                        onChange={(e) =>
                          setTermInputs((prev) => ({ ...prev, [ext.id]: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Zinssatz (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={rateInputs[ext.id] ?? ext.loan.interestRate}
                        onChange={(e) =>
                          setRateInputs((prev) => ({ ...prev, [ext.id]: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Einmalgebuehr (EUR)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={feeInputs[ext.id] ?? 0}
                        onChange={(e) =>
                          setFeeInputs((prev) => ({ ...prev, [ext.id]: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-on-surface-variant">
                      Bisherige Monatsrate:{" "}
                      <span className="font-semibold text-on-surface">
                        {formatEuroFromCents(ext.loan.monthlyPayment)}
                      </span>
                    </span>
                    <span className="text-on-surface-variant">
                      Neue Monatsrate:{" "}
                      <span className="font-semibold text-tertiary">
                        {newMonthly > 0 ? formatEuroFromCents(newMonthly) : "–"} / Monat
                      </span>
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Ablehnungsgrund (optional)"
                    value={rejectReasons[ext.id] ?? ""}
                    onChange={(e) =>
                      setRejectReasons((prev) => ({ ...prev, [ext.id]: e.target.value }))
                    }
                    className="max-w-xs"
                  />
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void reject(ext)}
                      disabled={loading}
                    >
                      Ablehnen
                    </Button>
                    <Button onClick={() => void approve(ext)} disabled={loading}>
                      Genehmigen
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
