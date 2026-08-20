"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type WalletStatus = "ACTIVE" | "LOCKED" | "REVOKED" | "NONE";

type FamilyCardProps = {
  initialStatus: WalletStatus;
  initialCardLastFour: string | null;
  balanceCents: number;
  airBalance: number;
};

type StatusResponse = {
  status: WalletStatus;
  exists: boolean;
  pass: {
    cardLastFour: string;
    status: WalletStatus;
    createdAt: string;
    updatedAt: string;
    revokedAt: string | null;
    lastPushUpdate: string | null;
  } | null;
};

const statusMeta: Record<
  WalletStatus,
  { dot: string; label: string; className: string }
> = {
  ACTIVE: {
    dot: "bg-emerald-400",
    label: "Aktiv",
    className: "text-emerald-300",
  },
  LOCKED: {
    dot: "bg-amber-400",
    label: "Gesperrt",
    className: "text-amber-300",
  },
  REVOKED: {
    dot: "bg-red-400",
    label: "Widerrufen",
    className: "text-red-300",
  },
  NONE: {
    dot: "bg-slate-500",
    label: "Noch nicht hinzugefügt",
    className: "text-slate-400",
  },
};

async function fetchPass() {
  const response = await fetch("/api/wallet/apple/create", {
    method: "POST",
    headers: {
      [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
    },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? "Family Card konnte nicht erstellt werden.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "family-card.pkpass";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function FamilyCard({
  initialStatus,
  initialCardLastFour,
  balanceCents,
  airBalance,
}: FamilyCardProps) {
  const [status, setStatus] = useState<WalletStatus>(initialStatus);
  const [cardLastFour, setCardLastFour] = useState<string | null>(
    initialCardLastFour,
  );
  const [busy, setBusy] = useState<null | "create" | "update" | "revoke">(null);
  const [message, setMessage] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    const response = await fetch("/api/wallet/apple/status");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as StatusResponse;
    if (!mountedRef.current) {
      return;
    }
    setStatus(data.status);
    setCardLastFour(data.pass?.cardLastFour ?? null);
  }, []);

  async function handleCreate() {
    setBusy("create");
    setMessage("");
    try {
      await fetchPass();
      await refreshStatus();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unbekannter Fehler.",
      );
    } finally {
      if (mountedRef.current) {
        setBusy(null);
      }
    }
  }

  async function handleUpdate() {
    setBusy("update");
    setMessage("");
    try {
      const response = await fetch("/api/wallet/apple/update", {
        method: "POST",
        headers: {
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
        },
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "Karte konnte nicht aktualisiert werden.");
        return;
      }
      setMessage("Karte wird aktualisiert…");
      window.setTimeout(() => {
        if (mountedRef.current) {
          setMessage("");
        }
      }, 4000);
    } finally {
      if (mountedRef.current) {
        setBusy(null);
      }
    }
  }

  async function handleRevoke() {
    if (!window.confirm("Family Card wirklich widerrufen?")) {
      return;
    }
    setBusy("revoke");
    setMessage("");
    try {
      const response = await fetch("/api/wallet/apple/revoke", {
        method: "POST",
        headers: {
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
        },
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "Karte konnte nicht widerrufen werden.");
        return;
      }
      await refreshStatus();
    } finally {
      if (mountedRef.current) {
        setBusy(null);
      }
    }
  }

  const meta = statusMeta[status];

  return (
    <div className="space-y-6" id="family-card">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0e16] via-[#0d1424] to-[#101a30] p-6 shadow-2xl ring-1 ring-slate-700/40 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">
              Family Bank
            </p>
            <p className="mt-1 text-lg font-display text-slate-100">
              Family Card
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold">
            <span
              className={cn("h-2 w-2 rounded-full", meta.dot, {
                "animate-pulse": status === "LOCKED",
              })}
            />
            <span className={meta.className}>{meta.label}</span>
          </span>
        </div>

        <div className="relative mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">
              Girokonto
            </p>
            <p className="mt-2 text-3xl font-display text-slate-100">
              {formatEuroFromCents(balanceCents)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-300">
              AirCoin
            </p>
            <p className="mt-2 text-3xl font-display text-sky-200">
              {formatAirFromUnits(airBalance)}
            </p>
          </div>
        </div>

        <div className="relative mt-8 flex items-center justify-between">
          <p className="font-mono text-base tracking-[0.2em] text-slate-300">
            {cardLastFour ? `•••• ${cardLastFour}` : "•••• ••••"}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
            Apple Wallet
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {status === "NONE" ? (
          <Button
            className="w-full rounded-xl"
            disabled={busy !== null}
            onClick={handleCreate}
            type="button"
          >
            {busy === "create" ? "Pass wird erstellt…" : "Zu Apple Wallet hinzufügen"}
          </Button>
        ) : (
          <>
            <Button
              className="w-full rounded-xl"
              disabled={busy !== null || status === "REVOKED"}
              onClick={handleCreate}
              type="button"
            >
              {status === "REVOKED"
                ? "Zu Apple Wallet hinzufügen"
                : "Apple Wallet öffnen"}
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="rounded-xl"
                disabled={busy !== null}
                onClick={handleUpdate}
                type="button"
                variant="outline"
              >
                {busy === "update" ? "Aktualisiere…" : "Karte aktualisieren"}
              </Button>
              <Button
                className="rounded-xl border-red-500/30 text-red-300 hover:bg-red-500/10"
                disabled={busy !== null || status === "REVOKED"}
                onClick={handleRevoke}
                type="button"
                variant="outline"
              >
                {busy === "revoke" ? "Widerrufe…" : "Karte widerrufen"}
              </Button>
            </div>
          </>
        )}

        {message ? (
          <p className="text-center text-sm text-slate-300">{message}</p>
        ) : null}

        <p className="text-center text-xs text-slate-500">
          Die angezeigten Salden dienen nur der Anzeige. Massgeblich ist stets
          der Kontostand im Online-Banking.
        </p>
      </div>
    </div>
  );
}
