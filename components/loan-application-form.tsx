"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatEuroFromCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function LoanApplicationForm({ products }: LoanApplicationFormProps) {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [termMonths, setTermMonths] = useState("12");
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const amountCents = Math.round(Number(amount) * 100);

  let monthlyPayment: number | null = null;
  const canCalculate = selectedProduct && amountCents > 0 && Number(termMonths) > 0;
  if (canCalculate) {
    const r = selectedProduct.interestRate / 100 / 12;
    const n = Number(termMonths);
    if (r === 0) {
      monthlyPayment = Math.round(amountCents / n);
    } else {
      const factor = Math.pow(1 + r, n);
      monthlyPayment = Math.round(amountCents * (r * factor) / (factor - 1));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    if (!selectedProductId || amountCents <= 0) {
      setMessage("Bitte gueltige Werte eingeben.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/customer/loans/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
      body: JSON.stringify({
        productId: selectedProductId,
        amount: amountCents,
        termMonths: Number(termMonths),
        purpose: purpose || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Kredit konnte nicht beantragt werden.");
      setLoading(false);
      return;
    }

    setMessage("Kredit beantragt! Du wirst weitergeleitet...");
    setTimeout(() => {
      router.push("/dashboard/kredite" as Route);
      router.refresh();
    }, 1500);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <Card className="space-y-4 lg:col-span-5">
        <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
          Produkte
        </h3>
        <div className="space-y-3">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selectedProductId === product.id
                  ? "border-primary-container/60 bg-primary-container/15"
                  : "glass-card hover:bg-surface-container"
              }`}
              onClick={() => {
                setSelectedProductId(product.id);
                setAmount("");
              }}
            >
              <p className="font-bold text-on-surface">{product.name}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{product.description}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                <span>
                  {formatEuroFromCents(product.minAmount)} –{" "}
                  {formatEuroFromCents(product.maxAmount)}
                </span>
                <span>
                  {product.minTermMonths}–{product.maxTermMonths} Monate
                </span>
                <span className="font-semibold text-primary">
                  {product.interestRate.toFixed(2)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 lg:col-span-7">
        <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Antrag</h3>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {selectedProduct ? (
            <div className="glass-card rounded-2xl p-4 text-sm">
              <p className="font-bold text-on-surface">{selectedProduct.name}</p>
              <p className="mt-1 text-on-surface-variant">{selectedProduct.description}</p>
              <p className="mt-2 text-primary">
                Zinssatz: {selectedProduct.interestRate.toFixed(2)}% p.a.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Kreditbetrag (EUR)</Label>
              <Input
                required
                type="number"
                min={
                  selectedProduct
                    ? (selectedProduct.minAmount / 100).toString()
                    : "0"
                }
                max={
                  selectedProduct
                    ? (selectedProduct.maxAmount / 100).toString()
                    : undefined
                }
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="z.B. 5000"
              />
              {selectedProduct ? (
                <p className="text-xs text-on-surface-variant">
                  Min. {formatEuroFromCents(selectedProduct.minAmount)} · Max.{" "}
                  {formatEuroFromCents(selectedProduct.maxAmount)}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Laufzeit (Monate)</Label>
              <Input
                required
                type="number"
                min={selectedProduct?.minTermMonths ?? 1}
                max={selectedProduct?.maxTermMonths ?? 120}
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
              />
              {selectedProduct ? (
                <p className="text-xs text-on-surface-variant">
                  {selectedProduct.minTermMonths}–{selectedProduct.maxTermMonths} Monate
                </p>
              ) : null}
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
                Bei {selectedProduct?.interestRate.toFixed(2)}% Zinsen p.a. über{" "}
                {termMonths} Monate
              </p>
            </div>
          ) : null}

          <Button className="h-14 w-full" type="submit" disabled={loading}>
            {loading ? "Wird gesendet..." : "Kredit beantragen"}
          </Button>
        </form>

        {message ? (
          <p className="text-sm text-primary">{message}</p>
        ) : null}
      </Card>
    </div>
  );
}
