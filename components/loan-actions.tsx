"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";
import { Button } from "@/components/ui/button";

type LoanActionsProps = {
  loanId: string;
  remainingAmount: number;
  monthlyPayment: number;
  canPay: boolean;
};

export function LoanActions({
  loanId,
  remainingAmount,
  monthlyPayment,
  canPay,
}: LoanActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: string) {
    setLoading(action);
    setMessage("");

    const response = await fetch(`/api/customer/loans/${loanId}/${action}`, {
      method: "POST",
      headers: {
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Aktion fehlgeschlagen.");
      setLoading(null);
      return;
    }

    setLoading(null);

    if (action === "pay") {
      setMessage("Rate bezahlt!");
    } else if (action === "payoff") {
      setMessage("Kredit vollstaendig getilgt!");
    } else if (action === "defer") {
      setMessage("Rate ausgesetzt, Laufzeit verlaengert.");
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {canPay ? (
          <Button
            onClick={() => void handleAction("pay")}
            disabled={loading !== null}
          >
            {loading === "pay" ? "Wird bezahlt..." : "Rate zahlen"}
          </Button>
        ) : null}

        {remainingAmount > 0 ? (
          <Button
            variant="outline"
            onClick={() => void handleAction("payoff")}
            disabled={loading !== null}
          >
            {loading === "payoff"
              ? "Wird getilgt..."
              : `Vorzeitig tilgen (${formatEuroFromCents(remainingAmount)})`}
          </Button>
        ) : null}

        {canPay ? (
          <Button
            variant="outline"
            onClick={() => void handleAction("defer")}
            disabled={loading !== null}
          >
            {loading === "defer" ? "Wird ausgesetzt..." : "Rate aussetzen"}
          </Button>
        ) : null}
      </div>

      {message ? <p className="text-sm text-primary">{message}</p> : null}
    </div>
  );
}
