"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type CardTabCard = {
  status: string;
  cardLastFour: string | null;
  phoneNumber: string | null;
  balanceCents: number;
  activatedAt: string | null;
};

type CardTabProps = {
  initialCard: CardTabCard | null;
  balanceCents: number;
  iframeUrl: string;
};

type CardResponse = {
  card?: {
    balanceCents: number;
    cardLastFour: string;
    phoneNumber: string;
    status: string;
  };
  error?: string;
};

const PIN_LENGTH = 4;
const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function CardTab({ initialCard, balanceCents, iframeUrl }: CardTabProps) {
  const router = useRouter();
  const [card, setCard] = useState<CardTabCard | null>(initialCard);
  const [step, setStep] = useState<"amount" | "pin">("amount");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");

  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  const isAmountValid = Number.isInteger(amountCents) && amountCents > 0;
  const formattedAmount = isAmountValid
    ? formatEuroFromCents(amountCents)
    : formatEuroFromCents(0);
  const cardActive = card?.status === "ACTIVE";

  function goToPinStep() {
    if (!isAmountValid) {
      setMessage("Bitte einen gueltigen Betrag eingeben.");
      return;
    }
    if (amountCents > balanceCents) {
      setMessage("Der verfuegbare Kontostand reicht nicht aus.");
      return;
    }
    setMessage("");
    setStep("pin");
  }

  function handleDigitInput(digit: string) {
    setMessage("");
    setPin((currentPin) =>
      currentPin.length >= PIN_LENGTH ? currentPin : `${currentPin}${digit}`,
    );
  }

  function handleBackspace() {
    setMessage("");
    setPin((currentPin) => currentPin.slice(0, -1));
  }

  async function handleTopup() {
    if (pin.length !== PIN_LENGTH) {
      setMessage("Bitte die 4-stellige PIN eingeben.");
      return;
    }

    setBusy(true);
    setMessage("");
    setSuccess("");

    try {
      const response = await fetch("/api/cards/topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
        },
        body: JSON.stringify({ amount: amountCents, pin }),
      });

      const data = (await response.json()) as CardResponse;

      if (!response.ok) {
        setMessage(data.error ?? "Aufladung konnte nicht ausgefuehrt werden.");
        return;
      }

      if (data.card) {
        setCard({
          status: data.card.status,
          cardLastFour: data.card.cardLastFour,
          phoneNumber: data.card.phoneNumber,
          balanceCents: data.card.balanceCents,
          activatedAt: card?.activatedAt ?? null,
        });
      }

      setSuccess(
        `Kartenguthaben um ${formatEuroFromCents(amountCents)} aufgeladen.`,
      );
      setAmount("");
      setPin("");
      setStep("amount");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <header>
        <p className="font-label-sm text-label-sm text-primary">
          Prepaid Mastercard
        </p>
        <h2 className="font-headline-md text-headline-md mt-2 text-on-surface">
          Karte
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Beantrage deine RBank-Karte, lade dein Kartenguthaben auf und verwalte
          sie hier.
        </p>
      </header>

      {/* Mastercard */}
      <div
        className={cn(
          "virtual-card-bg relative overflow-hidden rounded-2xl p-6 shadow-[0_20px_40px_rgba(127,61,255,0.25)] transition-transform duration-300 sm:p-8",
          !cardActive && "opacity-90 saturate-50",
        )}
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-white/70">RBank</p>
            <p className="mt-1 font-headline-md text-headline-md text-white">
              Prepaid Mastercard
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 font-label-sm text-label-sm text-white backdrop-blur-md">
            <span
              className={cn("h-2 w-2 rounded-full", {
                "animate-pulse bg-emerald-400": cardActive,
                "bg-slate-400": !cardActive,
              })}
            />
            {cardActive ? "Aktiv" : "Noch nicht aktiviert"}
          </span>
        </div>

        <div className="relative z-10 mt-10 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="font-label-sm text-label-sm text-white/70">
              Kartenguthaben
            </p>
            <p className="font-balance-display text-balance-display mt-2 text-white">
              {formatEuroFromCents(card?.balanceCents ?? 0)}
            </p>
          </div>
          {card?.phoneNumber ? (
            <div>
              <p className="font-label-sm text-label-sm text-white/70">
                Telefonnummer
              </p>
              <p className="mt-2 font-body-md text-body-md text-white">
                {card.phoneNumber}
              </p>
            </div>
          ) : null}
        </div>

        <div className="relative z-10 mt-10 flex items-center justify-between">
          <p className="font-mono text-base tracking-[0.2em] text-white">
            {card?.cardLastFour ? `•••• ${card.cardLastFour}` : "•••• ••••"}
          </p>
          <span className="flex items-center">
            <span className="h-8 w-8 rounded-full bg-[#EB001B] mix-blend-screen" />
            <span className="-ml-3 h-8 w-8 rounded-full bg-[#F79E1B] mix-blend-screen" />
          </span>
        </div>
      </div>

      {/* Top up */}
      {cardActive ? (
        <section className="glass-card space-y-4 rounded-2xl p-6">
          {step === "amount" ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">
                    Kartenguthaben aufladen
                  </h3>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Der Betrag wird von deinem Girokonto abgebucht.
                  </p>
                </div>
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">
                  Betrag
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    className="h-14 text-lg"
                    inputMode="decimal"
                    min="0"
                    placeholder="0,00"
                    step="0.01"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setMessage("");
                    }}
                    type="number"
                  />
                  <span className="text-2xl font-semibold text-on-surface">€</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Verfuegbares Guthaben</span>
                <span className="font-semibold text-on-surface">
                  {formatEuroFromCents(balanceCents)}
                </span>
              </div>

              <Button
                className="w-full"
                disabled={busy || !isAmountValid}
                onClick={goToPinStep}
                type="button"
              >
                Weiter zur PIN
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-label-sm text-label-sm text-primary">
                    Schritt 2
                  </p>
                  <h3 className="font-headline-md text-headline-md mt-2 text-on-surface">
                    PIN eingeben
                  </h3>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Bestaetige die Aufladung über {formattedAmount} mit deiner
                    4-stelligen PIN.
                  </p>
                </div>
                <Button
                  disabled={busy}
                  onClick={() => {
                    setStep("amount");
                    setPin("");
                    setMessage("");
                  }}
                  type="button"
                  variant="outline"
                >
                  Zurueck
                </Button>
              </div>

              <div className="space-y-3">
                <p className="font-label-sm text-label-sm text-on-surface">
                  Deine PIN
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: PIN_LENGTH }, (_, index) => (
                    <div
                      key={index}
                      aria-hidden="true"
                      className={cn(
                        "flex h-16 items-center justify-center rounded-2xl border text-3xl",
                        index < pin.length
                          ? "border-primary/40 bg-primary-container/20 text-primary"
                          : "glass-card text-on-surface-variant",
                      )}
                    >
                      {index < pin.length ? "*" : "•"}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {keypadDigits.map((digit) => (
                  <Button
                    key={digit}
                    className="h-16 rounded-2xl text-2xl"
                    disabled={busy}
                    onClick={() => handleDigitInput(digit)}
                    type="button"
                    variant="outline"
                  >
                    {digit}
                  </Button>
                ))}
                <Button
                  className="h-16 rounded-2xl text-sm"
                  disabled={busy}
                  onClick={handleBackspace}
                  type="button"
                  variant="outline"
                >
                  Loeschen
                </Button>
                <Button
                  className="h-16 rounded-2xl text-2xl"
                  disabled={busy}
                  onClick={() => handleDigitInput("0")}
                  type="button"
                  variant="outline"
                >
                  0
                </Button>
                <Button
                  className="h-16 rounded-2xl"
                  disabled={busy}
                  onClick={handleTopup}
                  type="button"
                >
                  {busy ? "Lade auf…" : "Bestaetigen"}
                </Button>
              </div>
            </>
          )}

          {message ? (
            <p className="text-center text-sm text-error">{message}</p>
          ) : null}
          {success ? (
            <p className="text-center text-sm text-secondary">{success}</p>
          ) : null}
        </section>
      ) : (
        <section className="glass-card space-y-3 rounded-2xl p-6 text-center">
          <span className="material-symbols-outlined mx-auto text-4xl text-primary">
            credit_card
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Karte beantragen
          </h3>
          <p className="text-sm text-on-surface-variant">
            Beantrage deine Prepaid Mastercard direkt unten im Formular. Nach der
            Aktivierung erscheinen hier die Kartendaten und du kannst dein
            Guthaben aufladen.
          </p>
        </section>
      )}

      {/* External card flow */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Kartenverwaltung
          </p>
          <a
            className="text-sm font-semibold text-primary transition-colors hover:opacity-80"
            href={iframeUrl}
            rel="noreferrer"
            target="_blank"
          >
            Im neuen Tab oeffnen
          </a>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
          <iframe
            allow="clipboard-read; clipboard-write; fullscreen"
            className="h-[640px] w-full md:h-[720px]"
            src={iframeUrl}
            title="RBank Karte"
          />
        </div>
      </section>
    </div>
  );
}