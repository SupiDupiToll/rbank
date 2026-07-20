"use client";

import { useState, useCallback, useEffect } from "react";
import type { AdminLoan, AdminLoanProduct } from "@/lib/admin-dashboard";
import { formatEuroFromCents } from "@/lib/money";
import { formatGermanDate, toDateInputValue } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, Td, Th } from "@/components/ui/table";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";

type AdminLoansProps = {
  initialProducts: AdminLoanProduct[];
  initialPendingLoans: AdminLoan[];
  initialActiveLoans: AdminLoan[];
  initialCompletedLoans: AdminLoan[];
};

export function AdminLoans({
  initialProducts,
  initialPendingLoans,
  initialActiveLoans,
  initialCompletedLoans,
}: AdminLoansProps) {
  const [products, setProducts] = useState<AdminLoanProduct[]>(initialProducts);
  const [pendingLoans, setPendingLoans] = useState<AdminLoan[]>(initialPendingLoans);
  const [activeLoans, setActiveLoans] = useState<AdminLoan[]>(initialActiveLoans);
  const [completedLoans, setCompletedLoans] = useState<AdminLoan[]>(initialCompletedLoans);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMinAmount, setNewMinAmount] = useState("");
  const [newMaxAmount, setNewMaxAmount] = useState("");
  const [newMinTerm, setNewMinTerm] = useState("6");
  const [newMaxTerm, setNewMaxTerm] = useState("12");
  const [newRate, setNewRate] = useState("4.5");

  const [message, setMessage] = useState("");

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/admin/loans/products");
    if (!res.ok) return;
    const data = await res.json() as { products: AdminLoanProduct[] };
    setProducts(data.products);
  }, []);

  const loadLoans = useCallback(async () => {
    const [pendingRes, activeRes, completedRes] = await Promise.all([
      fetch("/api/admin/loans?status=PENDING"),
      fetch("/api/admin/loans?status=ACTIVE"),
      fetch("/api/admin/loans?status=COMPLETED"),
    ]);
    if (pendingRes.ok) {
      const data = await pendingRes.json() as { loans: AdminLoan[] };
      setPendingLoans(data.loans);
    }
    if (activeRes.ok) {
      const data = await activeRes.json() as { loans: AdminLoan[] };
      setActiveLoans(data.loans);
    }
    if (completedRes.ok) {
      const data = await completedRes.json() as { loans: AdminLoan[] };
      setCompletedLoans(data.loans);
    }
  }, []);

  async function createProduct(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/admin/loans/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
      body: JSON.stringify({
        name: newName,
        description: newDescription,
        minAmount: Math.round(Number(newMinAmount) * 100),
        maxAmount: Math.round(Number(newMaxAmount) * 100),
        minTermMonths: Number(newMinTerm),
        maxTermMonths: Number(newMaxTerm),
        interestRate: Number(newRate),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Fehler beim Erstellen.");
      return;
    }

    setMessage("Produkt erstellt.");
    setNewName("");
    setNewDescription("");
    await loadProducts();
  }

  async function approveLoan(loanId: string) {
    setMessage("");
    const res = await fetch(`/api/admin/loans/${loanId}/approve`, {
      method: "POST",
      headers: { [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie() },
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Fehler bei Genehmigung.");
      return;
    }
    setMessage("Kredit genehmigt und ausgezahlt.");
    await loadLoans();
  }

  async function rejectLoan(loanId: string) {
    setMessage("");
    const res = await fetch(`/api/admin/loans/${loanId}/reject`, {
      method: "POST",
      headers: { [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie() },
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Fehler bei Ablehnung.");
      return;
    }
    setMessage("Kredit abgelehnt.");
    await loadLoans();
  }

  async function toggleProductActive(productId: string, isActive: boolean) {
    setMessage("");
    const res = await fetch(`/api/admin/loans/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (!res.ok) {
      setMessage("Fehler beim Umschalten.");
      return;
    }
    await loadProducts();
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-12">
        <Card className="space-y-4 lg:col-span-5">
          <h2 className="text-2xl font-display font-bold">
            Kreditprodukt anlegen
          </h2>
          <form className="space-y-4" onSubmit={createProduct}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Privatkredit"
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Input
                required
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Kurze Beschreibung"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Min. Betrag (EUR)</Label>
                <Input
                  required
                  type="number"
                  value={newMinAmount}
                  onChange={(e) => setNewMinAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max. Betrag (EUR)</Label>
                <Input
                  required
                  type="number"
                  value={newMaxAmount}
                  onChange={(e) => setNewMaxAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Min. Laufzeit (Monate)</Label>
                <Input
                  required
                  type="number"
                  value={newMinTerm}
                  onChange={(e) => setNewMinTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max. Laufzeit (Monate)</Label>
                <Input
                  required
                  type="number"
                  value={newMaxTerm}
                  onChange={(e) => setNewMaxTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Zinssatz (% p.a.)</Label>
              <Input
                required
                type="number"
                step="0.01"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>
            <Button className="h-14 w-full" type="submit">
              Produkt erstellen
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-7">
          <h2 className="mb-4 text-2xl font-display font-bold">
            Kreditprodukte
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Betrag</Th>
                  <Th>Laufzeit</Th>
                  <Th>Zins</Th>
                  <Th>Aktiv</Th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <Td>
                      <div className="font-bold text-slate-100">
                        {product.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {product.description}
                      </div>
                    </Td>
                    <Td>
                      {formatEuroFromCents(product.minAmount)} –{" "}
                      {formatEuroFromCents(product.maxAmount)}
                    </Td>
                    <Td>
                      {product.minTermMonths}–{product.maxTermMonths} Monate
                    </Td>
                    <Td>{product.interestRate.toFixed(2)}%</Td>
                    <Td>
                      <button
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          product.isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-slate-800 text-slate-400"
                        }`}
                        onClick={() =>
                          void toggleProductActive(product.id, product.isActive)
                        }
                        type="button"
                      >
                        {product.isActive ? "Aktiv" : "Inaktiv"}
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      </div>

      {pendingLoans.length > 0 ? (
        <Card>
          <h2 className="mb-4 text-2xl font-display font-bold">
            Kreditanfragen ({pendingLoans.length})
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Kunde</Th>
                  <Th>Produkt</Th>
                  <Th>Betrag</Th>
                  <Th>Zins</Th>
                  <Th>Laufzeit</Th>
                  <Th>Rate</Th>
                  <Th>Datum</Th>
                  <Th>Aktion</Th>
                </tr>
              </thead>
              <tbody>
                {pendingLoans.map((loan) => (
                  <tr key={loan.id}>
                    <Td>
                      <div className="font-bold text-slate-100">
                        {loan.user.displayName ?? "Kunde"}
                      </div>
                      <div className="text-xs text-slate-400">
                        #{loan.user.customerId}
                      </div>
                    </Td>
                    <Td>{loan.loanProduct?.name ?? "—"}</Td>
                    <Td className="font-bold">
                      {formatEuroFromCents(loan.amount)}
                    </Td>
                    <Td>{loan.interestRate.toFixed(2)}%</Td>
                    <Td>{loan.termMonths} Monate</Td>
                    <Td>{formatEuroFromCents(loan.monthlyPayment)}</Td>
                    <Td>{formatGermanDate(loan.createdAt)}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-background-dark"
                          onClick={() => void approveLoan(loan.id)}
                          type="button"
                        >
                          Genehmigen
                        </button>
                        <button
                          className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300"
                          onClick={() => void rejectLoan(loan.id)}
                          type="button"
                        >
                          Ablehnen
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-4 text-2xl font-display font-bold">
          Aktive Kredite ({activeLoans.length})
        </h2>
        {activeLoans.length === 0 ? (
          <p className="text-sm text-slate-400">Keine aktiven Kredite.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Kunde</Th>
                  <Th>Produkt</Th>
                  <Th>Betrag</Th>
                  <Th>Rest</Th>
                  <Th>Zins</Th>
                  <Th>Rate</Th>
                  <Th>Fortschritt</Th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((loan) => (
                  <tr key={loan.id}>
                    <Td>
                      <div className="font-bold text-slate-100">
                        {loan.user.displayName ?? "Kunde"}
                      </div>
                      <div className="text-xs text-slate-400">
                        #{loan.user.customerId}
                      </div>
                    </Td>
                    <Td>{loan.loanProduct?.name ?? "—"}</Td>
                    <Td>{formatEuroFromCents(loan.amount)}</Td>
                    <Td className="font-bold text-amber-400">
                      {formatEuroFromCents(loan.remainingAmount)}
                    </Td>
                    <Td>{loan.interestRate.toFixed(2)}%</Td>
                    <Td>{formatEuroFromCents(loan.monthlyPayment)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-700">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${Math.min(100, ((loan.amount - loan.remainingAmount) / loan.amount) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">
                          {Math.round(
                            ((loan.amount - loan.remainingAmount) / loan.amount) *
                              100,
                          )}
                          %
                        </span>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {completedLoans.length > 0 ? (
        <Card>
          <h2 className="mb-4 text-2xl font-display font-bold">
            Abgeschlossene Kredite
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Kunde</Th>
                  <Th>Produkt</Th>
                  <Th>Betrag</Th>
                  <Th>Zins</Th>
                  <Th>Abbezahlt</Th>
                </tr>
              </thead>
              <tbody>
                {completedLoans.map((loan) => (
                  <tr key={loan.id}>
                    <Td>
                      <div className="font-bold text-slate-100">
                        {loan.user.displayName ?? "Kunde"}
                      </div>
                      <div className="text-xs text-slate-400">
                        #{loan.user.customerId}
                      </div>
                    </Td>
                    <Td>{loan.loanProduct?.name ?? "—"}</Td>
                    <Td>{formatEuroFromCents(loan.amount)}</Td>
                    <Td>{loan.interestRate.toFixed(2)}%</Td>
                    <Td>
                      {loan.paidOffAt
                        ? formatGermanDate(loan.paidOffAt)
                        : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : null}

      {message ? <p className="text-sm text-primary">{message}</p> : null}
    </div>
  );
}
