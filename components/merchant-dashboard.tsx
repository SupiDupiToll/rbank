"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEuroFromCents } from "@/lib/money";
import { formatGermanDate } from "@/lib/date";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { toast } from "@/components/ui/toast";
import type { CustomerMerchant } from "@/app/api/customer/merchants/route";

export function MerchantDashboard() {
  const [merchants, setMerchants] = useState<CustomerMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMerchantId, setSelectedMerchantId] = useState("");
  const [refunding, setRefunding] = useState<string | null>(null);

  const loadMerchants = useCallback(async () => {
    try {
      const response = await fetch("/api/customer/merchants");
      if (!response.ok) return;
      const data = (await response.json()) as { merchants: CustomerMerchant[] };
      setMerchants(data.merchants);
      if (!selectedMerchantId && data.merchants.length > 0) {
        setSelectedMerchantId(data.merchants[0].merchantId);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMerchantId]);

  useEffect(() => {
    void loadMerchants();
  }, [loadMerchants]);

  const selectedMerchant =
    merchants.find((m) => m.merchantId === selectedMerchantId) ?? null;

  async function refundPayment(token: string) {
    setRefunding(token);
    try {
      const response = await fetch(
        `/api/customer/merchants/refund/${token}`,
        {
          method: "POST",
          headers: {
            [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
          },
        },
      );

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast(data.error ?? "Rueckerstattung fehlgeschlagen.", "error");
        return;
      }

      toast("Rueckerstattung ausgefuehrt.", "success");
      await loadMerchants();
    } finally {
      setRefunding(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-on-surface-variant">Händler werden geladen...</div>
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <div className="space-y-8 pb-8">
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
            Händler
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Dir sind noch keine Händler zugewiesen. Bitte wende dich an den
            Administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
          Händler
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Deine Händler und deren Zahlungseingänge
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {merchants.map((merchant) => (
          <button
            key={merchant.merchantId}
            type="button"
            onClick={() => setSelectedMerchantId(merchant.merchantId)}
            className={`glass-card rounded-2xl p-5 text-left transition-all ${
              selectedMerchantId === merchant.merchantId
                ? "border-primary-container/60 bg-primary-container/15"
                : "hover:bg-surface-container"
            }`}
          >
            <p className="text-sm font-bold text-on-surface">{merchant.name}</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              {merchant.merchantId.slice(0, 8)}...
            </p>
            <p className="font-balance-display text-balance-display mt-3 text-on-surface">
              {formatEuroFromCents(merchant.totalVolumeCents)}
            </p>
            <p className="text-xs text-on-surface-variant">Gesamtvolumen</p>
            <div className="mt-2 flex gap-4 text-xs text-on-surface-variant">
              <span>Heute: {formatEuroFromCents(merchant.volumeTodayCents)}</span>
              <span>Monat: {formatEuroFromCents(merchant.volumeMonthCents)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Session Table */}
      {selectedMerchant ? (
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="border-b border-white/10 px-6 py-4">
            <h3 className="font-bold text-on-surface">
              {selectedMerchant.name} – Zahlungen
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-on-surface-variant">
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">
                    Beschreibung
                  </th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">
                    Betrag
                  </th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedMerchant.sessions.map((session) => (
                  <tr
                    key={session.token}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          session.status === "COMPLETED"
                            ? "bg-primary-container/20 text-primary"
                            : session.status === "REFUNDED"
                              ? "bg-secondary-container/20 text-secondary"
                              : session.status === "PENDING"
                                ? "bg-tertiary-container/30 text-tertiary"
                                : "bg-surface-container-highest text-on-surface-variant"
                        }`}
                      >
                        {session.status === "COMPLETED"
                          ? "Bezahlt"
                          : session.status === "REFUNDED"
                            ? "Erstattet"
                            : session.status === "PENDING"
                              ? "Ausstehend"
                              : session.status === "CANCELLED"
                                ? "Storniert"
                                : "Abgelaufen"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-on-surface">
                        {session.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-medium text-on-surface">
                      {formatEuroFromCents(session.amount)}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {session.customerName ?? session.customerId ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {formatGermanDate(new Date(session.createdAt))}
                    </td>
                    <td className="px-6 py-4">
                      {session.status === "COMPLETED" ? (
                        <button
                          type="button"
                          disabled={refunding === session.token}
                          onClick={() => void refundPayment(session.token)}
                          className="rounded-full bg-secondary-container/20 px-3 py-1 text-xs font-bold text-secondary transition-colors hover:bg-secondary-container/30 disabled:opacity-50"
                        >
                          {refunding === session.token
                            ? "..."
                            : "Rückerstatten"}
                        </button>
                      ) : (
                        <span className="text-xs text-on-surface-variant">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {selectedMerchant.sessions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-sm text-on-surface-variant"
                    >
                      Noch keine Zahlungen vorhanden.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
