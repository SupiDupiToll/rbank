"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";

type Props = {
  initialEnabled: boolean;
};

export function DonationBoxesSettingsToggle({ initialEnabled }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleToggle() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/customer/settings/donation-boxes-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
        },
        body: JSON.stringify({ enabled: !enabled }),
      });

      const data = (await response.json()) as {
        enabled?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setMessage(data.error ?? "Einstellung konnte nicht gespeichert werden.");
        return;
      }

      setEnabled(Boolean(data.enabled));
      setMessage(
        data.enabled
          ? "Tab fuer Spendenboxen wurde freigeschaltet."
          : "Tab fuer Spendenboxen wurde ausgeblendet.",
      );
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-label-sm text-label-sm text-primary">
            Stack Auth +
          </p>
          <h3 className="font-headline-md text-headline-md mt-2 text-on-surface">
            Spendenboxen Liste
          </h3>
          <p className="mt-2 text-sm text-on-surface-variant">
            Aktiviert einen neuen Dashboard-Tab mit allen bisher erstellten
            Spendenboxen.
          </p>
        </div>
        <button
          aria-pressed={enabled}
          className={`relative inline-flex h-8 w-14 shrink-0 rounded-full border transition ${
            enabled
              ? "border-primary-container/60 bg-primary-container/25"
              : "border-outline-variant bg-surface-container-high"
          }`}
          onClick={() => void handleToggle()}
          type="button"
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full transition ${
              enabled ? "left-7 bg-primary" : "left-1 bg-on-surface-variant"
            }`}
          />
        </button>
      </div>

      <div className="glass-card flex items-center justify-between gap-4 rounded-2xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-on-surface">
            Status: {enabled ? "Aktiv" : "Inaktiv"}
          </p>
          <p className="text-sm text-on-surface-variant">
            {enabled
              ? "Der Reiter ist im Dashboard sichtbar."
              : "Der Reiter bleibt verborgen, bis du ihn aktivierst."}
          </p>
        </div>
        <Button
          className="h-10 px-4"
          disabled={isSaving}
          onClick={() => void handleToggle()}
          type="button"
          variant={enabled ? "outline" : "primary"}
        >
          {isSaving ? "Speichert..." : enabled ? "Ausschalten" : "Anschalten"}
        </Button>
      </div>

      {message ? <p className="text-sm text-on-surface">{message}</p> : null}
    </Card>
  );
}
