"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";

type FestgeldRenewButtonProps = {
  accountId: string;
};

export function FestgeldRenewButton({ accountId }: FestgeldRenewButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRenew() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/customer/festgeld/${accountId}/renew`, {
        method: "POST",
        headers: {
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie()
        }
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Verlängerung fehlgeschlagen.");
        return;
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {message ? <p className="text-sm text-red-400">{message}</p> : null}
      <Button className="w-full rounded-xl" disabled={isLoading} onClick={() => void handleRenew()} type="button">
        {isLoading ? "Verlängert..." : "Festgeld verlängern"}
      </Button>
    </div>
  );
}
