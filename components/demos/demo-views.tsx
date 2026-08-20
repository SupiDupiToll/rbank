"use client";

import { useState } from "react";
import { formatEuroFromCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  demoAdminUsers,
  demoAdminTransactions,
  demoAdminMerchants,
  demoAdminLoanProducts,
  demoAdminPendingLoans,
  demoAdminActiveLoans,
  demoAdminFestgeldAccounts,
  demoAdminAirTransactions,
  demoCheckoutSession,
  demoCheckoutUser,
  demoCustomer,
  demoDonationBoxes,
  demoEmbeddedUsers,
  demoFestgeldAccounts,
  demoLoanPayments,
  demoLoanProducts,
  demoLoans,
  demoMerchants,
  demoTransactions,
} from "@/components/demos/demo-data";

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("de-DE").format(new Date(dateValue));
}

function DemoCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-surface-container-high/40 p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function DemoEyebrow({
  children,
  color = "text-primary",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs font-bold uppercase tracking-[0.3em]",
        color,
      )}
    >
      {children}
    </p>
  );
}

function DemoInput({
  placeholder,
  value,
  readOnly = true,
}: {
  placeholder?: string;
  value?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="w-full rounded-lg bg-surface-container px-4 py-4 text-on-surface outline-none">
      {value ?? (
        <span className="text-on-surface-variant/70">{placeholder ?? "…"}</span>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const map: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: "Aktiv", className: "bg-primary/10 text-primary" },
    PENDING: { label: "Ausstehend", className: "bg-tertiary-container/30 text-tertiary" },
    COMPLETED: { label: "Bezahlt", className: "bg-primary-container/20 text-primary" },
    REFUNDED: { label: "Erstattet", className: "bg-secondary-container/20 text-secondary" },
    CANCELLED: { label: "Storniert", className: "bg-surface-container text-on-surface-variant" },
    EXPIRED: { label: "Abgelaufen", className: "bg-surface-container text-on-surface-variant" },
    UNLOCKED: { label: "Frei", className: "bg-primary/10 text-primary" },
    PAID_OUT: { label: "Ausgezahlt", className: "bg-surface-container text-on-surface-variant" },
    ABBEZAHLT: { label: "Abbezahlt", className: "bg-surface-container text-on-surface-variant" },
  };
  const meta = map[status] ?? { label: status, className: "bg-surface-container text-on-surface-variant" };

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    ADMIN: "Admin",
    TRANSFER: "P2P",
    CHECKOUT: "Checkout",
    DONATION: "Spende",
    REFUND: "Refund",
    OVERDRAFT_INTEREST: "Dispozins",
    LOAN_DISBURSEMENT: "Kredit",
    LOAN_REPAYMENT: "Rate",
  };
  return map[source] ?? source;
}

/* ------------------------------------------------------------------ */
/* Kundenbereich                                                       */
/* ------------------------------------------------------------------ */

export function DemoDashboardView() {
  const { customerId, displayName, balanceCents, airBalance, festgeldCents, loanDebtCents } =
    demoCustomer;
  const totalCents = balanceCents + festgeldCents - loanDebtCents;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/30 via-primary/15 to-transparent px-6 pb-10 pt-8 sm:px-8 sm:pt-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl sm:h-56 sm:w-56 sm:-right-16 sm:-top-16" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
          Gesamtkontostand
        </p>
        <p className="relative mt-3 text-5xl  tracking-tight text-on-surface sm:text-6xl">
          {formatEuroFromCents(totalCents)}
        </p>
        <div className="relative mt-6 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-on-surface-variant">Girokonto</p>
            <p className="mt-1 font-semibold text-on-surface">
              {formatEuroFromCents(balanceCents)}
            </p>
          </div>
          <div>
            <p className="text-on-surface-variant">AirCoin Konto</p>
            <p className="mt-1 font-semibold text-on-surface">
              {(airBalance / 100).toLocaleString("de-DE")} AIR
            </p>
          </div>
          <div>
            <p className="text-on-surface-variant">Festgeld</p>
            <p className="mt-1 font-semibold text-on-surface">
              {formatEuroFromCents(festgeldCents)}
            </p>
          </div>
          <div>
            <p className="text-on-surface-variant">Kreditschuld</p>
            <p className="mt-1 font-semibold text-error">
              -{formatEuroFromCents(loanDebtCents)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <DemoEyebrow color="text-on-surface-variant/70">Konten</DemoEyebrow>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-surface-container-high/40 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
              Girokonto
            </p>
            <p className="mt-3 text-3xl  text-on-surface">
              {formatEuroFromCents(balanceCents)}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">Standardkonto in EUR</p>
          </div>
          <div className="rounded-3xl border border-secondary/30 bg-secondary-container/10 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
              AirCoin Konto
            </p>
            <p className="mt-3 text-3xl  text-on-surface">
              {(airBalance / 100).toLocaleString("de-DE")} AIR
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Kleine eigene Währung :D
            </p>
          </div>
        </div>
      </div>

      <div>
        <DemoEyebrow color="text-on-surface-variant/70">Schnellzugriff</DemoEyebrow>
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
          {["Überweisen", "Empfangen", "Verlauf", "Kredite", "Festgeld", "Händler", "Spendenboxen", "Einstellungen"].map((label) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-high text-primary">
                <span className="text-lg font-bold">{label.slice(0, 2).toUpperCase()}</span>
              </span>
              <span className="truncate text-xs font-medium text-on-surface-variant">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-surface-container-high/40 px-5 py-4">
        <p className="text-xs text-on-surface-variant/70">Kundennummer</p>
        <p className="mt-1 font-mono text-lg tracking-wider text-on-surface">
          {customerId}
        </p>
      </div>
    </div>
  );
}

export function DemoTransferView() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/30 via-primary/15 to-transparent px-6 pb-8 pt-8 sm:px-8 sm:pt-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl sm:h-56 sm:w-56" />
        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
          Verfügbare Konten
        </p>
        <div className="relative mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-on-surface-variant">Girokonto</p>
            <p className="mt-2 text-4xl  tracking-tight text-on-surface">
              {formatEuroFromCents(demoCustomer.balanceCents)}
            </p>
          </div>
          <div>
            <p className="text-sm text-on-surface-variant">AirCoin Konto</p>
            <p className="mt-2 text-4xl  tracking-tight text-on-surface">
              {(demoCustomer.airBalance / 100).toLocaleString("de-DE")} AIR
            </p>
          </div>
        </div>
      </div>

      <div>
        <DemoEyebrow color="text-on-surface-variant/70">Überweisung senden</DemoEyebrow>
        <div className="mt-4 space-y-5">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-on-surface">
            Aktueller Kontostand:{" "}
            <span className="font-bold text-primary">
              {formatEuroFromCents(demoCustomer.balanceCents)}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">Währung</label>
            <div className="w-full rounded-lg border border-white/10 bg-surface-container-lowest px-4 py-3 text-on-surface">
              EUR
            </div>
            <p className="text-xs text-on-surface-variant">
              AIR ist eine interne Prämienwährung und kann nicht in Echtgeld
              umgetauscht werden.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">
              Empfänger-Kundennummer
            </label>
            <DemoInput value="10928374" />
            <p className="text-xs text-primary">Empfänger: Lisa Schmidt</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">
              Betrag in EUR
            </label>
            <DemoInput value="25,00" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">
              Verwendungszweck
            </label>
            <DemoInput value="Lunch, Geschenk, Rückzahlung" />
          </div>

          <div className="rounded-xl bg-primary-container px-6 py-3 text-center text-sm font-bold text-white glow-effect">
            Weiter zur PIN
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-container-high p-5">
            <DemoEyebrow>Schritt 2 · PIN eingeben</DemoEyebrow>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "flex h-16 items-center justify-center rounded-2xl border text-3xl",
                    i < 4
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 bg-surface-container-high text-on-surface-variant/70",
                  )}
                >
                  {i < 4 ? "*" : ""}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"].map(
                (key, index) => (
                  <div
                    key={`${key}-${index}`}
                    className={cn(
                      "flex h-16 items-center justify-center rounded-2xl border text-2xl",
                      key
                        ? "border-white/10 bg-surface-container-high text-on-surface"
                        : "bg-transparent",
                    )}
                  >
                    {key}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DemoTransactionsView() {
  const eurTransactions = demoTransactions.filter((t) => t.currency === "EUR");
  const airTransactions = demoTransactions.filter((t) => t.currency === "AIR");
  const incoming = eurTransactions
    .filter((t) => t.type === "INCOMING")
    .reduce((s, t) => s + t.amount, 0);
  const outgoing = eurTransactions
    .filter((t) => t.type === "OUTGOING")
    .reduce((s, t) => s + t.amount, 0);
  const airNet = airTransactions.reduce(
    (s, t) => s + (t.type === "INCOMING" ? t.amount : -t.amount),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-primary/10 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
            Eingänge
          </p>
          <p className="mt-2 text-3xl  text-primary">
            +{formatEuroFromCents(incoming)}
          </p>
        </div>
        <div className="rounded-2xl bg-red-500/10 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-error/80">
            Ausgänge
          </p>
          <p className="mt-2 text-3xl  text-error">
            -{formatEuroFromCents(outgoing)}
          </p>
        </div>
        <div className="rounded-2xl bg-secondary-container/20 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary/80">
            AirCoin
          </p>
          <p className="mt-2 text-3xl  text-secondary">
            {(airNet / 100).toLocaleString("de-DE")} AIR
          </p>
        </div>
      </div>

      <DemoInput placeholder="Suchen…" />

      <div className="space-y-3">
        {demoTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-surface-container-high/40 p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-on-surface">
                  {transaction.description}
                </p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    transaction.source === "TRANSFER"
                      ? "bg-primary/10 text-primary"
                      : transaction.source === "DONATION"
                        ? "bg-primary-container/20 text-primary"
                        : transaction.source === "CHECKOUT"
                          ? "bg-secondary-container/20 text-secondary"
                          : "bg-surface-container text-on-surface-variant",
                  )}
                >
                  {sourceLabel(transaction.source)}
                </span>
                <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {transaction.currency}
                </span>
              </div>
              <p className="mt-1 text-sm text-on-surface-variant/70">
                {formatDate(transaction.date)}
              </p>
            </div>
            <p
              className={cn(
                "shrink-0 font-bold",
                transaction.type === "INCOMING"
                  ? "text-primary"
                  : "text-error",
              )}
            >
              {transaction.type === "INCOMING" ? "+" : "-"}
              {(
                transaction.currency === "AIR"
                  ? `${(transaction.amount / 100).toLocaleString("de-DE")} AIR`
                  : formatEuroFromCents(transaction.amount)
              ).replace("-", "")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoLoansView() {
  const activeLoans = demoLoans.filter((l) => l.status === "ACTIVE");
  const totalRemaining = activeLoans.reduce((s, l) => s + l.remainingAmount, 0);
  const totalBorrowed = activeLoans.reduce((s, l) => s + l.amount, 0);
  const nextPayment = demoLoanPayments.find((p) => p.status !== "PAID");

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent px-6 pb-8 pt-8 sm:px-8 sm:pt-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl sm:h-56 sm:w-56" />
        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-blue-400/80">
          Kredite gesamt
        </p>
        <p className="relative mt-3 text-5xl  tracking-tight text-on-surface sm:text-6xl">
          {formatEuroFromCents(totalBorrowed)}
        </p>
        <div className="relative mt-6 flex gap-6 text-sm">
          <div>
            <p className="text-on-surface-variant">Offener Betrag</p>
            <p className="mt-1 font-semibold text-on-surface">
              {formatEuroFromCents(totalRemaining)}
            </p>
          </div>
          <div>
            <p className="text-on-surface-variant">Aktive Kredite</p>
            <p className="mt-1 font-semibold text-on-surface">
              {activeLoans.length}
            </p>
          </div>
        </div>
      </div>

      {nextPayment ? (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">
            Naechste Rate
          </p>
          <p className="mt-2 text-lg font-semibold text-on-surface">
            {formatEuroFromCents(nextPayment.amount)} am{" "}
            {formatDate(nextPayment.date)}
          </p>
          <p className="text-sm text-on-surface-variant">
            Privatkredit · Rate {nextPayment.installment}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <DemoEyebrow color="text-on-surface-variant/70">Meine Kredite</DemoEyebrow>
        <span className="rounded-xl bg-primary-container px-4 py-2 text-sm font-bold text-white glow-effect">
          + Beantragen
        </span>
      </div>

      <div className="space-y-3">
        {demoLoans.map((loan) => (
          <div
            key={loan.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-surface-container-high/40 p-5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-on-surface">
                  {loan.name}
                </p>
                <StatusBadge status={loan.status === "COMPLETED" ? "ABBEZAHLT" : loan.status} />
              </div>
              <p className="mt-1 text-sm text-on-surface-variant/70">
                {loan.termMonths} Monate · {loan.interestRate.toFixed(2)}% ·{" "}
                {formatDate(loan.createdAt)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-bold text-on-surface">
                {formatEuroFromCents(loan.amount)}
              </p>
              {loan.status === "ACTIVE" ? (
                <p className="mt-1 text-xs text-blue-400">
                  Rest {formatEuroFromCents(loan.remainingAmount)}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoLoanApplyView() {
  const [selectedProductId, setSelectedProductId] = useState(demoLoanProducts[0].id);
  const selectedProduct = demoLoanProducts.find((p) => p.id === selectedProductId);

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <DemoCard className="space-y-4 lg:col-span-5">
        <h3 className="text-xl  font-bold">Produkte</h3>
        <div className="space-y-3">
          {demoLoanProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => setSelectedProductId(product.id)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition",
                selectedProductId === product.id
                  ? "border-primary bg-primary/10"
                  : "border-white/10 bg-surface-container-high/40 hover:border-white/10",
              )}
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
      </DemoCard>

      <DemoCard className="space-y-4 lg:col-span-7">
        <h3 className="text-xl  font-bold">Antrag</h3>
        <div className="space-y-4">
          {selectedProduct ? (
            <div className="rounded-2xl border border-white/10 bg-surface-container-high p-4 text-sm">
              <p className="font-bold text-on-surface">{selectedProduct.name}</p>
              <p className="mt-1 text-on-surface-variant">{selectedProduct.description}</p>
              <p className="mt-2 text-primary">
                Zinssatz: {selectedProduct.interestRate.toFixed(2)}% p.a.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface">
                Kreditbetrag (EUR)
              </label>
              <DemoInput value="5000" />
              <p className="text-xs text-on-surface-variant/70">
                Min. 1.000,00 € · Max. 50.000,00 €
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface">
                Laufzeit (Monate)
              </label>
              <DemoInput value="48" />
              <p className="text-xs text-on-surface-variant/70">6–84 Monate</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">
              Verwendungszweck (optional)
            </label>
            <DemoInput value="Neue Küche" />
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Voraussichtliche monatliche Rate
            </p>
            <p className="mt-2 text-3xl  text-on-surface">
              {formatEuroFromCents(11862)}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Bei 6.50% Zinsen p.a. über 48 Monate
            </p>
          </div>

          <div className="h-14 w-full rounded-xl bg-primary-container px-6 py-3 text-center text-sm font-bold text-white glow-effect">
            Kredit beantragen
          </div>
        </div>
      </DemoCard>
    </div>
  );
}

export function DemoFestgeldView() {
  const totalAmount = demoFestgeldAccounts
    .filter((a) => a.status === "ACTIVE" || a.status === "UNLOCKED")
    .reduce((s, a) => s + a.amount, 0);
  const activeCount = demoFestgeldAccounts.filter((a) => a.status === "ACTIVE").length;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent px-6 pb-8 pt-8 sm:px-8 sm:pt-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-tertiary-container/30 blur-2xl sm:h-56 sm:w-56" />
        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-tertiary/80">
          Festgeld gesamt
        </p>
        <p className="relative mt-3 text-5xl  tracking-tight text-on-surface sm:text-6xl">
          {formatEuroFromCents(totalAmount)}
        </p>
        <div className="relative mt-6 flex gap-6 text-sm">
          <div>
            <p className="text-on-surface-variant">Aktive Konten</p>
            <p className="mt-1 font-semibold text-on-surface">{activeCount}</p>
          </div>
          <div>
            <p className="text-on-surface-variant">Gesamt</p>
            <p className="mt-1 font-semibold text-on-surface">
              {demoFestgeldAccounts.length}
            </p>
          </div>
        </div>
      </div>

      <div>
        <DemoEyebrow color="text-on-surface-variant/70">Konten</DemoEyebrow>
        <div className="mt-4 space-y-3">
          {demoFestgeldAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-surface-container-high/40 p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-on-surface">
                    {account.label}
                  </p>
                  <StatusBadge status={account.status} />
                </div>
                <p className="mt-1 text-sm text-on-surface-variant/70">
                  {formatDate(account.startDate)} – {formatDate(account.endDate)} ·{" "}
                  {account.interestRate.toFixed(2)}%
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold text-on-surface">
                  {formatEuroFromCents(account.amount)}
                </p>
                {account.status === "ACTIVE" ? (
                  <p className="mt-1 text-xs text-tertiary">
                    +{formatEuroFromCents(account.amount * account.interestRate / 100)} Zins
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DemoMerchantView() {
  const [selectedMerchantId, setSelectedMerchantId] = useState(demoMerchants[0].merchantId);
  const selectedMerchant =
    demoMerchants.find((m) => m.merchantId === selectedMerchantId) ?? demoMerchants[0];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h2 className="text-2xl  font-bold text-on-surface">Händler</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Deine Händler und deren Zahlungseingänge
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {demoMerchants.map((merchant) => (
          <button
            key={merchant.merchantId}
            type="button"
            onClick={() => setSelectedMerchantId(merchant.merchantId)}
            className={cn(
              "rounded-2xl border p-5 text-left transition-all",
              selectedMerchantId === merchant.merchantId
                ? "border-primary bg-primary/10"
                : "border-white/10 bg-surface-container-high/40 hover:border-white/10",
            )}
          >
            <p className="text-sm font-bold text-on-surface">{merchant.name}</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              {merchant.merchantId.slice(0, 8)}...
            </p>
            <p className="mt-3 text-2xl  text-on-surface">
              {formatEuroFromCents(merchant.totalVolumeCents)}
            </p>
            <p className="text-xs text-on-surface-variant/70">Gesamtvolumen</p>
            <div className="mt-2 flex gap-4 text-xs text-on-surface-variant">
              <span>Heute: {formatEuroFromCents(merchant.volumeTodayCents)}</span>
              <span>Monat: {formatEuroFromCents(merchant.volumeMonthCents)}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-surface-container-high/40">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="font-bold text-on-surface">
            {selectedMerchant.name} – Zahlungen
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-on-surface-variant/70">
                <th className="px-6 py-3 font-semibold uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 font-semibold uppercase tracking-wider">Beschreibung</th>
                <th className="px-6 py-3 font-semibold uppercase tracking-wider">Betrag</th>
                <th className="px-6 py-3 font-semibold uppercase tracking-wider">Kunde</th>
                <th className="px-6 py-3 font-semibold uppercase tracking-wider">Datum</th>
                <th className="px-6 py-3 font-semibold uppercase tracking-wider">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {selectedMerchant.sessions.map((session) => (
                <tr key={session.token} className="border-b border-white/10 last:border-0">
                  <td className="px-6 py-4">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-on-surface">{session.description}</p>
                  </td>
                  <td className="px-6 py-4 font-medium text-on-surface">
                    {formatEuroFromCents(session.amount)}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {session.customerName ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{formatDate(session.date)}</td>
                  <td className="px-6 py-4">
                    {session.status === "COMPLETED" ? (
                      <span className="rounded-lg bg-secondary-container/25 px-3 py-1 text-xs font-bold text-secondary">
                        Rückerstatten
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant/60">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function DemoDonationBoxesView() {
  const ownBoxes = demoDonationBoxes.filter(
    (box) => box.ownerCustomerId === demoCustomer.customerId,
  );
  const allBoxes = demoDonationBoxes;

  return (
    <div className="space-y-8 pb-8">
      <header>
        <DemoEyebrow>Community</DemoEyebrow>
        <h2 className="mt-2 text-3xl  text-on-surface">Spendenboxen</h2>
        <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
          Erstelle eigene Spendenboxen mit persoenlichem Link und sieh dir alle
          bisher erstellten Boxen im Netzwerk an.
        </p>
      </header>

      <DemoCard className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-on-surface">
            Neue Spendenbox erstellen
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Name eingeben, Link erzeugen und direkt teilen.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="w-full rounded-lg bg-surface-container px-4 py-4 text-on-surface-variant/70">
            z. B. Klassenfahrt 2026
          </div>
          <span className="inline-flex h-14 items-center justify-center rounded-2xl bg-primary-container px-6 text-sm font-bold text-white glow-effect">
            Spendenbox erstellen
          </span>
        </div>
      </DemoCard>

      <section className="space-y-4">
        <div>
          <DemoEyebrow color="text-on-surface-variant/70">Deine Boxen</DemoEyebrow>
          <h3 className="mt-2 text-2xl  text-on-surface">
            Eigene Spendenlinks
          </h3>
        </div>
        <div className="space-y-3">
          {ownBoxes.map((box) => (
            <DonationBoxRow key={box.id} box={box} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <DemoEyebrow color="text-on-surface-variant/70">Netzwerk</DemoEyebrow>
          <h3 className="mt-2 text-2xl  text-on-surface">
            Alle Spendenboxen
          </h3>
        </div>
        <div className="space-y-3">
          {allBoxes.map((box) => (
            <DonationBoxRow key={box.id} box={box} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DonationBoxRow({
  box,
}: {
  box: { name: string; link: string; ownerName: string; ownerCustomerId: string; createdAt: string };
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-container-high p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-on-surface">{box.name}</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            von {box.ownerName} · #{box.ownerCustomerId}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant/70">
            Erstellt am {formatDate(box.createdAt)}
          </p>
          <p className="mt-2 block truncate text-sm text-primary">
            {box.link}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <span className="inline-flex h-10 items-center rounded-full border-2 border-white/10 px-4 text-xs font-bold text-on-surface">
            Link kopieren
          </span>
          <span className="inline-flex h-10 items-center rounded-full border-2 border-white/10 px-4 text-xs font-bold text-on-surface">
            Oeffnen
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Zahlungen                                                           */
/* ------------------------------------------------------------------ */

function CheckoutShell({
  merchantName,
  children,
}: {
  merchantName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.18),_transparent_36%),linear-gradient(180deg,_#030712_0%,_#020617_100%)] px-4 py-8 text-on-surface sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            RBank Checkout
          </p>
          <p className="mt-3 text-base text-on-surface-variant">{merchantName}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="grid grid-cols-6 gap-3">
      {Array.from({ length }, (_, index) => (
        <div
          key={index}
          className={cn(
            "flex h-14 items-center justify-center rounded-2xl border text-2xl",
            index < filled
              ? "border-primary/40 bg-primary-container/10 text-primary"
              : "border-white/10 bg-surface-container-high text-on-surface-variant/70",
          )}
        >
          {index < filled ? "*" : ""}
        </div>
      ))}
    </div>
  );
}

function PinKeypad() {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"];
  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((key, index) =>
        key ? (
          <div
            key={`${key}-${index}`}
            className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-surface-container-high text-lg font-bold text-white"
          >
            {key}
          </div>
        ) : (
          <div key={`empty-${index}`} />
        ),
      )}
    </div>
  );
}

function Row({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-on-surface-variant">{label}</span>
      <span className={negative ? "font-bold text-rose-200" : "font-bold text-white"}>
        {value}
      </span>
    </div>
  );
}

export function DemoCheckoutView() {
  const session = demoCheckoutSession;
  const user = demoCheckoutUser;
  const remainingBalance = user.balanceCents - session.amount;

  return (
    <CheckoutShell merchantName={session.merchant.name}>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-container-high/40 p-0">
        <div className="relative overflow-hidden border-b border-white/10 px-6 py-8 sm:px-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/20" />
          <div className="pointer-events-none absolute -bottom-14 -left-14 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-black text-primary">
              {session.merchant.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-primary">
                RBank Pay
              </p>
              <h1 className="mt-3 text-4xl  font-black leading-[1.1] tracking-tight text-white sm:text-5xl">
                Bezahlung an {session.merchant.name}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
                Sicherer Checkout mit PIN-Bestaetigung und direkter Belastung
                deines RBank-Kontos.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="rounded-xl border border-white/10 bg-surface-container-high/40 p-6">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Betrag</p>
            <p className="mt-3 text-5xl  font-black tracking-tight text-white">
              {formatEuroFromCents(session.amount)}
            </p>
            <p className="mt-4 text-base leading-relaxed text-on-surface-variant">
              {session.description}
            </p>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-surface-container-high/40 p-6">
              <p className="text-sm text-on-surface-variant">Hallo, {user.displayName}</p>
              <div className="mt-4 space-y-3 text-sm">
                <Row label="Kontostand" value={formatEuroFromCents(user.balanceCents)} />
                <Row label="Belastung" value={`- ${formatEuroFromCents(session.amount)}`} negative />
                <Row label="Verbleibend" value={formatEuroFromCents(remainingBalance)} />
                <Row label="An" value={session.merchant.name} />
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-surface-container-high/40 p-6">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">
                PIN bestaetigen
              </p>
              <PinDots length={4} filled={2} />
              <PinKeypad />
            </div>

            <div className="h-14 w-full rounded-2xl bg-primary-container text-center text-sm font-bold text-on-surface inline-flex items-center justify-center">
              Jetzt bezahlen
            </div>
            <p className="text-center text-sm font-semibold text-on-surface-variant">
              Abbrechen
            </p>
          </div>
        </div>
      </div>
    </CheckoutShell>
  );
}

export function DemoEmbeddedCheckoutView() {
  const [selectedUserId, setSelectedUserId] = useState(demoEmbeddedUsers[0].id);
  const selectedUser = demoEmbeddedUsers.find((u) => u.id === selectedUserId);
  const [step, setStep] = useState<"user" | "pin">("user");

  return (
    <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.18),_transparent_36%),linear-gradient(180deg,_#030712_0%,_#020617_100%)] px-4 py-5 text-on-surface">
      <div className="mx-auto flex min-h-[480px] max-w-md flex-col">
        <div className="mb-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
            <span className={cn("flex items-center gap-1.5", step === "user" || step === "pin" ? "text-white" : "text-on-surface-variant/60")}>
              <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold", step === "user" || step === "pin" ? "border border-primary text-primary" : "border border-white/10 text-on-surface-variant/60")}>
                •
              </span>
              Nutzer
            </span>
            <span className={cn("h-px w-5", step === "pin" ? "bg-primary-container/50" : "bg-surface-container")} />
            <span className={cn("flex items-center gap-1.5", step === "pin" ? "text-white" : "text-on-surface-variant/60")}>
              <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold", step === "pin" ? "border border-primary text-primary" : "border border-white/10 text-on-surface-variant/60")}>
                •
              </span>
              PIN
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-bold text-white">
            Kaffeehaus Central
          </p>
          <p className="mt-0.5 text-2xl font-black tracking-tight text-primary">
            {formatEuroFromCents(690)}
          </p>
        </div>

        {step === "user" ? (
          <div className="flex flex-1 flex-col">
            <div className="w-full rounded-lg border border-white/10 bg-surface-container-high px-3 py-2 text-sm text-on-surface-variant/60">
              Nutzer suchen
            </div>
            <div className="mt-2 flex-1 space-y-1.5">
              {demoEmbeddedUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUserId(user.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition",
                    selectedUserId === user.id
                      ? "border-primary-container/60 bg-primary-container/10"
                      : "border-white/10 bg-surface-container-high hover:border-white/10",
                  )}
                >
                  <p className="truncate text-sm font-semibold text-white">{user.displayName}</p>
                  <p className="truncate text-[11px] text-on-surface-variant/70">#{user.customerId}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep("pin")}
              className="mt-3 w-full rounded-lg bg-primary-container py-2.5 text-sm font-bold text-on-surface"
            >
              Weiter
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {selectedUser ? (
              <div className="rounded-lg border border-white/10 bg-surface-container-high px-3 py-2">
                <p className="truncate text-sm font-semibold text-white">{selectedUser.displayName}</p>
                <p className="truncate text-[11px] text-on-surface-variant/70">#{selectedUser.customerId}</p>
              </div>
            ) : null}

            <div className="mt-3 flex justify-center gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex h-10 w-8 items-center justify-center rounded-md border text-base font-bold",
                    index < 2
                      ? "border-primary-container/60 bg-primary-container/10 text-primary"
                      : "border-white/10 bg-surface-container-high text-transparent",
                  )}
                >
                  *
                </div>
              ))}
            </div>

            <div className="mt-3 grid flex-1 grid-cols-3 gap-1.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"].map(
                (key, index) =>
                  key ? (
                    <div
                      key={`${key}-${index}`}
                      className="flex h-12 items-center justify-center rounded-lg border border-white/10 bg-surface-container-high text-base font-bold text-white"
                    >
                      {key === "←" ? "⌫" : key}
                    </div>
                  ) : (
                    <div key={`empty-${index}`} />
                  ),
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep("user")}
              className="mt-3 w-full rounded-lg bg-primary-container py-2.5 text-sm font-bold text-on-surface"
            >
              Jetzt bezahlen
            </button>
            <p className="mt-2 w-full text-center text-xs font-semibold text-on-surface-variant/70">
              Zurueck
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DemoPaymentRequestView() {
  const [step, setStep] = useState<"amount" | "pin">("pin");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="space-y-8 rounded-2xl border border-white/10 bg-surface-container-high/40 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <DemoEyebrow>Schritt {step === "amount" ? "1" : "2"}</DemoEyebrow>
            <h2 className="mt-3 text-3xl  text-on-surface">
              {step === "amount" ? "Betrag eingeben" : "PIN eingeben"}
            </h2>
          </div>
          <span className="inline-flex h-12 items-center rounded-xl border-2 border-white/10 px-6 text-sm font-bold text-on-surface">
            Zurück
          </span>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm text-on-surface-variant">Betrag</p>
          <p className="mt-2 text-4xl  text-primary">
            {formatEuroFromCents(2500)}
          </p>
          <p className="mt-4 text-sm text-on-surface-variant">Empfänger</p>
          <p className="mt-1 font-semibold text-on-surface">max@mustermann.de</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-on-surface">
            PIN des zahlenden Nutzers
          </p>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className={cn(
                  "flex h-16 items-center justify-center rounded-2xl border text-3xl",
                  index < 3
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-white/10 bg-surface-container-high text-on-surface-variant/70",
                )}
              >
                {index < 3 ? "*" : ""}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit, index) => (
            <div
              key={`${digit}-${index}`}
              className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-surface-container-high text-2xl text-on-surface"
            >
              {digit}
            </div>
          ))}
          <div className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-surface-container-high text-lg text-on-surface">
            Löschen
          </div>
          <div className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-surface-container-high text-2xl text-on-surface">
            0
          </div>
          <div className="flex h-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-2xl font-bold text-primary">
            OK
          </div>
        </div>

        <div className="h-14 w-full rounded-xl bg-primary-container text-center text-sm font-bold text-white inline-flex items-center justify-center glow-effect">
          Zahlung bestaetigen
        </div>
      </div>
    </div>
  );
}

export function DemoPublicDonationBoxView() {
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-10 sm:px-6">
      <header className="relative overflow-hidden rounded-xl border border-white/10 bg-surface-container-high/40 px-6 py-10 sm:px-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/20" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative z-10">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            RBank Spendenbox
          </p>
          <h1 className="mt-4 text-5xl  font-black leading-[1.1] tracking-tight text-on-surface sm:text-6xl">
            Tierheim Hoffnung
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-on-surface-variant">
            Spende direkt ueber diese Spendenbox mit deinem RBank-Konto und
            bestaetige die Zahlung spaeter sicher mit deiner PIN.
          </p>
        </div>
      </header>

      <div className="space-y-6 rounded-xl border border-white/10 bg-surface-container-high/40 p-6 sm:p-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Beitrag
          </p>
          <div className="mt-3 w-full rounded-lg bg-surface-container px-4 py-4 text-on-surface">
            10,00
          </div>
          <p className="mt-3 text-lg text-on-surface-variant">10,00 €</p>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            Nachricht optional
          </p>
          <div className="w-full rounded-lg bg-surface-container px-4 py-4 text-on-surface">
            Spende fuer Tierheim Hoffnung
          </div>
        </div>

        <div className="h-14 w-full rounded-full bg-primary-container text-center text-lg font-bold text-white inline-flex items-center justify-center glow-effect">
          Mit RBank spenden
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

const adminTabs = [
  { id: "dashboard", label: "Übersicht" },
  { id: "customers", label: "Kunden" },
  { id: "festgeld", label: "Festgeld" },
  { id: "loans", label: "Kredite" },
  { id: "merchants", label: "Händler" },
  { id: "aircoin", label: "AirCoin" },
] as const;

type AdminTabId = (typeof adminTabs)[number]["id"];

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-container-high p-4">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-on-surface-variant/70">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass-card mesh-gradient rounded-xl p-5">
      <p className="font-label-sm text-label-sm text-on-surface-variant/70">
        {label}
      </p>
      <p className="font-headline-md text-headline-md mt-2 text-on-surface">{value}</p>
      <p className="mt-1 text-xs text-on-surface-variant/70">{sub}</p>
    </div>
  );
}

function AdminTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs text-on-surface-variant/70">
            {headers.map((header) => (
              <th key={header} className="px-6 py-3 font-semibold uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function DemoAdminView() {
  const [activeTab, setActiveTab] = useState<AdminTabId>("dashboard");
  const totalBalance = demoAdminUsers.reduce((s, u) => s + u.balanceCents, 0);
  const activeFestgeldVolume = demoAdminFestgeldAccounts
    .filter((a) => a.status === "ACTIVE")
    .reduce((s, a) => s + a.amount, 0);
  const activeLoanVolume = demoAdminActiveLoans.reduce((s, l) => s + l.remainingAmount, 0);
  const airInCirculation = demoAdminAirTransactions.reduce(
    (s, t) => s + (t.type === "INCOMING" ? t.amount : -t.amount),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-surface-container-high p-1">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-primary-container text-white"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Kunden"
            value={demoAdminUsers.length.toString()}
            sub={`${formatEuroFromCents(totalBalance)} Gesamt`}
          />
          <KpiCard
            label="Einlagen"
            value={formatEuroFromCents(totalBalance)}
            sub={`${demoAdminUsers.length} Kunden`}
          />
          <KpiCard
            label="Festgeld"
            value={formatEuroFromCents(activeFestgeldVolume)}
            sub="aktiv"
          />
          <KpiCard
            label="Kreditvolumen"
            value={formatEuroFromCents(activeLoanVolume)}
            sub={`${demoAdminActiveLoans.length} aktiv`}
          />
          <KpiCard
            label="Kreditanfragen"
            value={demoAdminPendingLoans.length.toString()}
            sub="Ausstehend"
          />
          <KpiCard
            label="AirCoin"
            value={`${(airInCirculation / 100).toLocaleString("de-DE")} AIR`}
            sub="Im Umlauf"
          />
        </div>
      ) : null}

      {activeTab === "customers" ? (
        <div className="space-y-6">
          <DemoCard>
            <h2 className="mb-4 text-2xl  font-bold">Kunden</h2>
            <AdminTable headers={["Kunde", "Konten"]}>
              {demoAdminUsers.map((user) => (
                <tr key={user.customerId} className="border-b border-white/10 last:border-0">
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">{user.displayName}</div>
                    <div className="text-xs text-on-surface-variant">
                      #{user.customerId} · {user.stackUserId}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold">
                    <div className="flex items-center gap-2">
                      <span>{formatEuroFromCents(user.balanceCents)}</span>
                      <span className="text-primary">✓</span>
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      berechnet: {formatEuroFromCents(user.computedBalanceCents)}
                    </div>
                    <div className="text-xs text-secondary">
                      {(user.airBalance / 100).toLocaleString("de-DE")} AIR
                    </div>
                  </td>
                </tr>
              ))}
            </AdminTable>
          </DemoCard>

          <DemoCard>
            <h2 className="mb-4 text-2xl  font-bold">Verlauf</h2>
            <AdminTable headers={["Datum", "Beschreibung", "Betrag"]}>
              {demoAdminTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-white/10 last:border-0">
                  <td className="px-6 py-4">{formatDate(transaction.date)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-surface-container px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {sourceLabel(transaction.source)}
                      </span>
                      <span className="rounded-full bg-surface-container px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {transaction.currency}
                      </span>
                      <span>{transaction.description}</span>
                    </div>
                  </td>
                  <td
                    className={cn(
                      "px-6 py-4 font-bold",
                      transaction.type === "INCOMING" ? "text-primary" : "text-error",
                    )}
                  >
                    {transaction.type === "INCOMING" ? "+ " : "- "}
                    {transaction.currency === "AIR"
                      ? `${(transaction.amount / 100).toLocaleString("de-DE")} AIR`
                      : formatEuroFromCents(transaction.amount)}
                  </td>
                </tr>
              ))}
            </AdminTable>
          </DemoCard>
        </div>
      ) : null}

      {activeTab === "festgeld" ? (
        <DemoCard>
          <h2 className="mb-4 text-2xl  font-bold">Festgeldkonten</h2>
          <AdminTable headers={["Kunde", "Bezeichnung", "Betrag", "Zins", "Laufzeit", "Status"]}>
            {demoAdminFestgeldAccounts.map((account) => (
              <tr key={account.id} className="border-b border-white/10 last:border-0">
                <td className="px-6 py-4">
                  <div className="font-bold">{account.user.displayName}</div>
                  <div className="text-xs text-on-surface-variant">#{account.user.customerId}</div>
                </td>
                <td className="px-6 py-4">{account.label}</td>
                <td className="px-6 py-4">{formatEuroFromCents(account.amount)}</td>
                <td className="px-6 py-4">{account.interestRate.toFixed(2)}%</td>
                <td className="px-6 py-4">
                  {formatDate(account.startDate)} - {formatDate(account.endDate)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={account.status} />
                    {account.status === "UNLOCKED" ? (
                      <span className="rounded-lg bg-primary-container px-3 py-1 text-xs font-bold text-white">
                        Auszahlen
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        </DemoCard>
      ) : null}

      {activeTab === "loans" ? (
        <div className="space-y-6">
          <DemoCard>
            <h2 className="mb-4 text-2xl  font-bold">Kreditprodukte</h2>
            <AdminTable headers={["Name", "Betrag", "Laufzeit", "Zins", "Gebühr", "Aktiv"]}>
              {demoAdminLoanProducts.map((product) => (
                <tr key={product.id} className="border-b border-white/10 last:border-0">
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">{product.name}</div>
                    <div className="text-xs text-on-surface-variant">{product.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    {formatEuroFromCents(product.minAmount)} – {formatEuroFromCents(product.maxAmount)}
                  </td>
                  <td className="px-6 py-4">
                    {product.minTermMonths}–{product.maxTermMonths} Monate
                  </td>
                  <td className="px-6 py-4">{product.interestRate.toFixed(2)}%</td>
                  <td className="px-6 py-4">
                    {product.oneTimeFeeCents ? formatEuroFromCents(product.oneTimeFeeCents) : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={product.isActive ? "ACTIVE" : "EXPIRED"} />
                  </td>
                </tr>
              ))}
            </AdminTable>
          </DemoCard>

          <DemoCard>
            <h2 className="mb-4 text-2xl  font-bold">
              Kreditanfragen ({demoAdminPendingLoans.length})
            </h2>
            <AdminTable headers={["Kunde", "Produkt", "Betrag", "Zins", "Laufzeit", "Rate", "Aktion"]}>
              {demoAdminPendingLoans.map((loan) => (
                <tr key={loan.id} className="border-b border-white/10 last:border-0">
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">{loan.user.displayName}</div>
                    <div className="text-xs text-on-surface-variant">#{loan.user.customerId}</div>
                  </td>
                  <td className="px-6 py-4">{loan.loanProduct.name}</td>
                  <td className="px-6 py-4 font-bold">{formatEuroFromCents(loan.amount)}</td>
                  <td className="px-6 py-4">{loan.interestRate.toFixed(2)}%</td>
                  <td className="px-6 py-4">{loan.termMonths} Monate</td>
                  <td className="px-6 py-4">{formatEuroFromCents(loan.monthlyPayment)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <span className="rounded-lg bg-primary-container px-3 py-1 text-xs font-bold text-white">
                        Genehmigen
                      </span>
                      <span className="rounded-lg bg-error-container/40 px-3 py-1 text-xs font-bold text-error">
                        Ablehnen
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </AdminTable>
          </DemoCard>

          <DemoCard>
            <h2 className="mb-4 text-2xl  font-bold">
              Aktive Kredite ({demoAdminActiveLoans.length})
            </h2>
            <AdminTable headers={["Kunde", "Produkt", "Betrag", "Rest", "Zins", "Rate", "Fortschritt"]}>
              {demoAdminActiveLoans.map((loan) => (
                <tr key={loan.id} className="border-b border-white/10 last:border-0">
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">{loan.user.displayName}</div>
                    <div className="text-xs text-on-surface-variant">#{loan.user.customerId}</div>
                  </td>
                  <td className="px-6 py-4">{loan.loanProduct.name}</td>
                  <td className="px-6 py-4">{formatEuroFromCents(loan.amount)}</td>
                  <td className="px-6 py-4 font-bold text-tertiary">
                    {formatEuroFromCents(loan.remainingAmount)}
                  </td>
                  <td className="px-6 py-4">{loan.interestRate.toFixed(2)}%</td>
                  <td className="px-6 py-4">{formatEuroFromCents(loan.monthlyPayment)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-container-highest">
                        <div
                          className="h-full rounded-full bg-primary-container"
                          style={{
                            width: `${Math.min(100, ((loan.amount - loan.remainingAmount) / loan.amount) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        {Math.round(((loan.amount - loan.remainingAmount) / loan.amount) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </AdminTable>
          </DemoCard>
        </div>
      ) : null}

      {activeTab === "merchants" ? (
        <div className="space-y-6">
          {demoAdminMerchants.map((merchant) => (
            <DemoCard key={merchant.id}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl  font-bold">{merchant.name}</h2>
                  <p className="mt-1 font-mono text-xs text-on-surface-variant">{merchant.merchantId}</p>
                  {merchant.ownerName ? (
                    <p className="mt-1 text-xs text-primary">
                      Besitzer: {merchant.ownerName} (#{merchant.ownerCustomerId})
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <MetricCard label="Heute" value={formatEuroFromCents(merchant.volumeTodayCents)} />
                  <MetricCard label="Monat" value={formatEuroFromCents(merchant.volumeMonthCents)} />
                  <MetricCard label="Gesamt" value={formatEuroFromCents(merchant.totalVolumeCents)} />
                </div>
              </div>
              <AdminTable headers={["Status", "Beschreibung", "Betrag", "Kunde", "Datum", "Aktion"]}>
                {merchant.sessions.map((session) => (
                  <tr key={session.token} className="border-b border-white/10 last:border-0">
                    <td className="px-6 py-4">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-on-surface">{session.description}</div>
                      <div className="text-xs text-on-surface-variant">{formatDate(session.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4">{formatEuroFromCents(session.amount)}</td>
                    <td className="px-6 py-4">{session.customerName ?? "—"}</td>
                    <td className="px-6 py-4">{formatDate(session.createdAt)}</td>
                    <td className="px-6 py-4">
                      {session.status === "COMPLETED" ? (
                        <span className="rounded-lg bg-secondary-container/25 px-3 py-1 text-xs font-bold text-secondary">
                          Refund
                        </span>
                      ) : (
                        <span className="text-xs text-on-surface-variant/70">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </AdminTable>
            </DemoCard>
          ))}
        </div>
      ) : null}

      {activeTab === "aircoin" ? (
        <div className="grid gap-8 lg:grid-cols-12">
          <DemoCard className="space-y-4 lg:col-span-4">
            <h2 className="text-2xl  font-bold">AirCoin</h2>
            <MetricCard label="Im Umlauf" value={`${(airInCirculation / 100).toLocaleString("de-DE")} AIR`} />
            <p className="text-sm text-on-surface-variant">
              AIR ist intern, bankweit buchbar und nicht in Echtgeld
              konvertierbar.
            </p>
          </DemoCard>

          <DemoCard className="lg:col-span-8">
            <h2 className="mb-4 text-2xl  font-bold">AIR-Transaktionen</h2>
            <AdminTable headers={["Datum", "Kunde", "Beschreibung", "Betrag"]}>
              {demoAdminAirTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-white/10 last:border-0">
                  <td className="px-6 py-4">{formatDate(transaction.date)}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-on-surface">{transaction.customerName}</div>
                    <div className="text-xs text-on-surface-variant">#{transaction.customerId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-secondary-container/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
                        {transaction.source}
                      </span>
                      <span>{transaction.description}</span>
                    </div>
                  </td>
                  <td
                    className={cn(
                      "px-6 py-4 font-bold",
                      transaction.type === "INCOMING" ? "text-primary" : "text-error",
                    )}
                  >
                    {transaction.type === "INCOMING" ? "+ " : "- "}
                    {(transaction.amount / 100).toLocaleString("de-DE")} AIR
                  </td>
                </tr>
              ))}
            </AdminTable>
          </DemoCard>
        </div>
      ) : null}
    </div>
  );
}
