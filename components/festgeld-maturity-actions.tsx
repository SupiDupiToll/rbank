"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";

type FestgeldMaturityActionsProps = {
  accountId: string;
};

export function FestgeldMaturityActions({ accountId }: FestgeldMaturityActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"renew" | "payout" | null>(null);

  async function runAction(action: "renew" | "payout") {
    setPendingAction(action);
    setMessage("");

    try {
      const response = await fetch(`/api/customer/festgeld/${accountId}/${action}`, {
        method: "POST",
        headers: {
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie()
        }
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Aktion fehlgeschlagen.");
        return;
      }

      router.refresh();
    } finally {
      setPendingAction(null);
    }
  }

  const isLoading = pendingAction !== null;

  return (
    <div className="space-y-3">
      {message ? <p className="text-sm text-red-400">{message}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Button className="w-full rounded-xl" disabled={isLoading} onClick={() => void runAction("renew")} type="button">
          {pendingAction === "renew" ? "Verlängert..." : "Festgeld verlängern"}
        </Button>
        <Button
          className="w-full rounded-xl"
          disabled={isLoading}
          onClick={() => void runAction("payout")}
          type="button"
          variant="outline"
        >
          {pendingAction === "payout" ? "Wird ausgezahlt..." : "Alles ins Guthaben auszahlen"}
        </Button>
      </div>
    </div>
  );
}
