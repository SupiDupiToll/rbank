"use client";

import { useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  appendDigits,
  NumericKeypad,
  removeLastDigit,
} from "@/components/ui/numeric-keypad";
import { Stepper } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  interestRate: number;
};

type LoanApplicationFormProps = {
  products: Product[];
};

const STEP_LABELS = ["Betrag", "Angebot", "Details", "Prüfen"];
const MAX_DIGITS = 9;

function calculateMonthlyPayment(
  amount: number,
  annualInterestRate: number,
  termMonths: number,
): number {
  if (amount <= 0 || termMonths <= 0) return 0;
  const r = annualInterestRate / 100 / 12;
  const n = termMonths;
  if (r === 0) return Math.round(amount / n);
  const factor = Math.pow(1 + r, n);
  return Math.round((amount * (r * factor)) / (factor - 1));
}

export function LoanApplicationForm({ products }: LoanApplicationFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? "",
  );
  const [termMonths, setTermMonths] = useState("");
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const amountCents = amountInput === "" ? 0 : Number(amountInput);
  const amountEuroLabel =
    amountCents === 0 ? "0,00 €" : formatEuroFromCents(amountCents);

  const matchingProducts = useMemo(
    () =>
      products.filter(
        (p) => amountCents >= p.minAmount && amountCents <= p.maxAmount,
      ),
    [products, amountCents],
  );

  const effectiveProducts =
    matchingProducts.length > 0 ? matchingProducts : products;

  const selectedProduct =
    effectiveProducts.find((p) => p.id === selectedProductId) ??
    effectiveProducts[0];

  const hasEnteredAmount = amountCents > 0;

  const term = selectedProduct ? Number(termMonths) : 0;
  const termIsValid = !!selectedProduct &&
    Number.isFinite(term) &&
    term >= selectedProduct.minTermMonths &&
    term <= selectedProduct.maxTermMonths;

  const monthlyPayment =
    selectedProduct && termIsValid
      ? calculateMonthlyPayment(amountCents, selectedProduct.interestRate, term)
      : null;

  function resetTermForProduct(product: Product | undefined) {
    if (!product) {
      setTermMonths("");
      return;
    }
    const initial = Math.min(
      Math.max(product.minTermMonths, 12),
      product.maxTermMonths,
    );
    setTermMonths(String(initial));
  }

  function handleSelectProduct(id: string) {
    setSelectedProductId(id);
    const product = effectiveProducts.find((p) => p.id === id);
    resetTermForProduct(product);
    setMessage("");
  }

  function handleAmountAppend(digits: string) {
    setAmountInput((current) => appendDigits(current, digits, MAX_DIGITS));
    setMessage("");
  }

  function handleAmountBackspace() {
    setAmountInput((current) => removeLastDigit(current));
  }

  function goToDetails() {
    if (!selectedProduct) {
      setMessage("Bitte wähle ein Angebot aus.");
      return;
    }
    resetTermForProduct(selectedProduct);
    setStep(2);
  }

  function goToReview() {
    if (!termIsValid || !selectedProduct) {
      setMessage("Bitte wähle eine gültige Laufzeit.");
      return;
    }
    setMessage("");
    setStep(3);
  }

  async function handleSubmit() {
    if (!selectedProduct || amountCents <= 0 || !termIsValid) {
      setMessage("Bitte vervollständige deine Angaben.");
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/customer/loans/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          amount: amountCents,
          termMonths: term,
          purpose: purpose || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "Kredit konnte nicht beantragt werden.");
        setLoading(false);
        return;
      }

      setMessage("Kredit beantragt! Du wirst weitergeleitet...");
      setStep(3);
      setTimeout(() => {
        router.push("/dashboard/kredite" as Route);
        router.refresh();
      }, 1200);
    } catch {
      setMessage("Kredit konnte nicht beantragt werden.");
      setLoading(false);
    }
  }

  const formattedTerm = termIsValid ? `${term} Monate` : "—";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Stepper steps={STEP_LABELS} current={step} />

      {step === 0 ? (
        <div className="space-y-6">
          <div className="text-center">
            <p className="font-label-sm text-label-sm text-primary">
              Kredit beantragen
            </p>
            <h3 className="font-headline-md text-headline-md mt-1 text-on-surface">
              Wie viel brauchst du?
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Wähle einen Betrag oder tippe ihn ein.
            </p>
          </div>

          <div className="text-center">
            <p className="font-balance-display text-balance-display break-words text-on-surface">
              {amountEuroLabel}
            </p>
            <div className="mt-4 flex justify-center">
              <input
                type="range"
                min={products.length > 0 ? products[0].minAmount : 0}
                max={
                  products.length > 0
                    ? products[products.length - 1].maxAmount
                    : 0
                }
                step={5000}
                value={Math.min(
                  amountCents,
                  products.length > 0
                    ? products[products.length - 1].maxAmount
                    : 0,
                )}
                onChange={(e) => setAmountInput(String(Number(e.target.value)))}
                className="w-full max-w-xs accent-[var(--color-primary)]"
              />
            </div>
          </div>

          <NumericKeypad
            onAppend={handleAmountAppend}
            onBackspace={handleAmountBackspace}
          />

          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-on-surface-variant">
              Min.{" "}
              {products.length > 0
                ? formatEuroFromCents(products[0].minAmount)
                : "—"}
            </span>
            <span className="text-on-surface-variant">
              Max.{" "}
              {products.length > 0
                ? formatEuroFromCents(products[products.length - 1].maxAmount)
                : "—"}
            </span>
          </div>

          {message ? (
            <p className="text-center text-sm text-error">{message}</p>
          ) : null}

          <Button
            className="h-14 w-full"
            disabled={!hasEnteredAmount}
            onClick={() => {
              setMessage("");
              setStep(1);
            }}
            type="button"
          >
            Weiter
          </Button>

          <Link
            href={"/dashboard/kredite"}
            className="flex items-center justify-center gap-2 text-sm font-medium text-primary transition hover:opacity-80"
          >
            <span className="material-symbols-outlined text-lg">person_book</span>
            Zu meinen Krediten
          </Link>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Wähle dein Angebot
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Passend zu {amountEuroLabel}
            </p>
          </div>

          {matchingProducts.length === 0 ? (
            <div className="glass-card rounded-2xl border-error/30 p-5 text-sm">
              <p className="font-semibold text-on-surface">
                Kein passendes Angebot für diesen Betrag gefunden.
              </p>
              <p className="mt-1 text-on-surface-variant">
                Bitte wähle einen Betrag zwischen{" "}
                {products.length > 0
                  ? formatEuroFromCents(products[0].minAmount)
                  : "—"}{" "}
                und{" "}
                {products.length > 0
                  ? formatEuroFromCents(
                      products[products.length - 1].maxAmount,
                    )
                  : "—"}
                .
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matchingProducts.map((product) => {
                const isSelected = selectedProductId === product.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product.id)}
                    className={cn(
                      "block w-full rounded-2xl border p-4 text-left transition",
                      isSelected
                        ? "border-primary-container/60 bg-primary-container/15"
                        : "glass-card hover:bg-surface-container",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-on-surface">
                        {product.name}
                      </p>
                      <span className="rounded-full bg-primary-container/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {product.interestRate.toFixed(2)}% p.a.
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {product.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                      <span>
                        {formatEuroFromCents(product.minAmount)} –{" "}
                        {formatEuroFromCents(product.maxAmount)}
                      </span>
                      <span>
                        {product.minTermMonths}–{product.maxTermMonths} Monate
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {message ? <p className="text-sm text-error">{message}</p> : null}

          <div className="flex flex-col gap-3">
            <Button
              className="h-14 w-full"
              disabled={matchingProducts.length === 0}
              onClick={goToDetails}
              type="button"
            >
              Weiter
            </Button>
            <Button
              className="w-full"
              onClick={() => setStep(0)}
              type="button"
              variant="outline"
            >
              Zurück
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Details
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Passe Laufzeit und Verwendungszweck an.
            </p>
          </div>

          {selectedProduct ? (
            <div className="space-y-5">
              <div className="glass-card space-y-2 rounded-2xl p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Angebot</span>
                  <span className="font-semibold text-on-surface">
                    {selectedProduct.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Kreditbetrag</span>
                  <span className="font-semibold text-on-surface">
                    {amountEuroLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Zinssatz</span>
                  <span className="font-semibold text-on-surface">
                    {selectedProduct.interestRate.toFixed(2)}% p.a.
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Laufzeit: {formattedTerm}</Label>
                <input
                  type="range"
                  min={selectedProduct.minTermMonths}
                  max={selectedProduct.maxTermMonths}
                  value={termIsValid ? term : selectedProduct.minTermMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  className="w-full accent-[var(--color-primary)]"
                />
                <div className="flex justify-between text-xs text-on-surface-variant">
                  <span>{selectedProduct.minTermMonths} Monate</span>
                  <span>{selectedProduct.maxTermMonths} Monate</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Verwendungszweck (optional)</Label>
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="z.B. Auto, Umbau, etc."
                />
              </div>

              {monthlyPayment !== null && monthlyPayment > 0 ? (
                <div className="glass-card mesh-gradient rounded-2xl p-5">
                  <p className="font-label-sm text-label-sm text-primary">
                    Voraussichtliche monatliche Rate
                  </p>
                  <p className="font-balance-display text-balance-display mt-2 text-on-surface">
                    {formatEuroFromCents(monthlyPayment)}
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Bei {selectedProduct.interestRate.toFixed(2)}% Zinsen p.a.
                    über {term} Monate
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {message ? <p className="text-sm text-error">{message}</p> : null}

          <div className="flex flex-col gap-3">
            <Button
              className="h-14 w-full"
              disabled={!termIsValid}
              onClick={goToReview}
              type="button"
            >
              Weiter
            </Button>
            <Button
              className="w-full"
              onClick={() => setStep(1)}
              type="button"
              variant="outline"
            >
              Zurück
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Alles korrekt?
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Bitte überprüfe deine Angaben.
            </p>
          </div>

          {selectedProduct ? (
            <Card className="space-y-3 p-5">
              <SummaryRow label="Angebot" value={selectedProduct.name} />
              <SummaryRow label="Kreditbetrag" value={amountEuroLabel} />
              <SummaryRow
                label="Zinssatz"
                value={`${selectedProduct.interestRate.toFixed(2)}% p.a.`}
              />
              <SummaryRow label="Laufzeit" value={`${term} Monate`} />
              {monthlyPayment !== null ? (
                <SummaryRow
                  label="Monatliche Rate"
                  value={formatEuroFromCents(monthlyPayment)}
                  emphasized
                />
              ) : null}
              {purpose.trim() ? (
                <SummaryRow label="Verwendungszweck" value={purpose.trim()} />
              ) : null}
            </Card>
          ) : null}

          {message ? <p className="text-sm text-primary">{message}</p> : null}

          <div className="flex flex-col gap-3">
            <Button
              className="h-14 w-full"
              disabled={loading}
              onClick={handleSubmit}
              type="button"
            >
              {loading ? "Wird gesendet..." : "Kredit beantragen"}
            </Button>
            <Button
              className="w-full"
              onClick={() => setStep(2)}
              type="button"
              variant="outline"
            >
              Zurück
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span
        className={cn(
          "text-right font-semibold text-on-surface",
          emphasized && "text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}
