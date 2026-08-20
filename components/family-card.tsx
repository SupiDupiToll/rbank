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
      <div className="virtual-card-bg relative rounded-2xl p-6 shadow-[0_20px_40px_rgba(127,61,255,0.25)] transition-transform duration-300 sm:p-8">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-white/70">RBank</p>
            <p className="mt-1 font-headline-md text-headline-md text-white">
              Family Card
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 font-label-sm text-label-sm text-white backdrop-blur-md">
            <span
              className={cn("h-2 w-2 rounded-full", "bg-white", {
                "animate-pulse": status === "LOCKED",
              })}
            />
            {meta.label}
          </span>
        </div>

        <div className="relative z-10 mt-10 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="font-label-sm text-label-sm text-white/70">
              Girokonto
            </p>
            <p className="font-balance-display text-balance-display mt-2 text-white">
              {formatEuroFromCents(balanceCents)}
            </p>
          </div>
          <div>
            <p className="font-label-sm text-label-sm text-white/70">AirCoin</p>
            <p className="font-balance-display text-balance-display mt-2 text-white">
              {formatAirFromUnits(airBalance)}
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-10 flex items-center justify-between">
          <p className="font-mono text-base tracking-[0.2em] text-white">
            {cardLastFour ? `•••• ${cardLastFour}` : "•••• ••••"}
          </p>
          <span className="material-symbols-outlined text-2xl text-white/70">
            contactless
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {status === "NONE" ? (
          <Button
            className="w-full"
            disabled={busy !== null}
            onClick={handleCreate}
            type="button"
          >
            {busy === "create"
              ? "Pass wird erstellt…"
              : "Zu Apple Wallet hinzufügen"}
          </Button>
        ) : (
          <>
            <Button
              className="w-full"
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
                disabled={busy !== null}
                onClick={handleUpdate}
                type="button"
                variant="outline"
              >
                {busy === "update" ? "Aktualisiere…" : "Karte aktualisieren"}
              </Button>
              <Button
                className="border-error/30 text-error hover:bg-error-container/20"
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
          <p className="text-center text-sm text-on-surface">{message}</p>
        ) : null}

        <p className="text-center text-xs text-on-surface-variant">
          Die angezeigten Salden dienen nur der Anzeige. Massgeblich ist stets
          der Kontostand im Online-Banking.
        </p>
      </div>
    </div>
  );
}
