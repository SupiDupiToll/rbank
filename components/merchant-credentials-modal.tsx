"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type MerchantCredentialsModalProps = {
  merchantId: string;
  merchantName: string;
  merchantSecret: string;
  webhookSecret: string;
  onDismiss: () => void;
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
        {label}
      </p>
      <div className="flex items-center gap-2 rounded-xl bg-slate-900 p-3">
        <code className="flex-1 break-all font-mono text-sm text-slate-100">
          {value}
        </code>
        <Button
          onClick={handleCopy}
          variant="outline"
          className="shrink-0 text-xs"
          type="button"
        >
          {copied ? "Kopiert!" : "Kopieren"}
        </Button>
      </div>
    </div>
  );
}

export function MerchantCredentialsModal({
  merchantId,
  merchantName,
  merchantSecret,
  webhookSecret,
  onDismiss,
}: MerchantCredentialsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Haendler-Zugangsdaten"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-display font-bold text-slate-100">
              Zugangsdaten: {merchantName}
            </h2>
            <p className="mt-1 text-xs text-amber-300/80">
              ⚠️ Diese Werte werden nur einmal angezeigt. Bitte sofort sichern!
            </p>
          </div>
          <button
            className="text-slate-400 hover:text-slate-200"
            onClick={onDismiss}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <CopyField label="Merchant ID" value={merchantId} />
          <CopyField label="Merchant Secret" value={merchantSecret} />
          <CopyField label="Webhook Secret" value={webhookSecret} />
        </div>

        <div className="mt-6">
          <Button className="h-12 w-full" onClick={onDismiss} type="button">
            Verstanden, alles gespeichert
          </Button>
        </div>
      </div>
    </div>
  );
}
