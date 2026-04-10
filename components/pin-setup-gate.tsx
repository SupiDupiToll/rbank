"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";

type PinSetupGateProps = {
  hasPin: boolean;
  children: React.ReactNode;
};

export function PinSetupGate({ hasPin, children }: PinSetupGateProps) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmationPin, setConfirmationPin] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pin.length !== 4 || confirmationPin.length !== 4) {
      setMessage("Bitte zwei 4-stellige PINs eingeben.");
      return;
    }

    if (pin !== confirmationPin) {
      setMessage("Die PINs stimmen nicht überein.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/customer/pin/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie()
        },
        body: JSON.stringify({
          pin,
          confirmationPin
        })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "PIN konnte nicht gespeichert werden.");
        return;
      }

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div aria-hidden={!hasPin} className={hasPin ? undefined : "pointer-events-none select-none blur-sm"}>
        {children}
      </div>

      {!hasPin ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-background-dark p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">PIN erforderlich</p>
            <h2 className="mt-3 text-3xl font-display text-slate-100">Zugang absichern</h2>
            <p className="mt-3 text-sm text-slate-300">
              Bevor Sie fortfahren, müssen Sie einmalig eine 4-stellige PIN einrichten.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200">PIN</label>
                <Input
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                  placeholder="1234"
                  value={pin}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200">PIN bestätigen</label>
                <Input
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) => setConfirmationPin(event.target.value.replace(/\D/g, ""))}
                  placeholder="1234"
                  value={confirmationPin}
                />
              </div>

              {message ? <p className="text-sm text-red-300">{message}</p> : null}

              <Button className="w-full rounded-xl" disabled={isSubmitting} type="submit">
                {isSubmitting ? "PIN wird gespeichert..." : "PIN einrichten"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
