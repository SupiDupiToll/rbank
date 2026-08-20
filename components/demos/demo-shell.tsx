"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DemoAdminView,
  DemoCheckoutView,
  DemoDonationBoxesView,
  DemoEmbeddedCheckoutView,
  DemoFestgeldView,
  DemoLoanApplyView,
  DemoLoansView,
  DemoMerchantView,
  DemoPaymentRequestView,
  DemoPublicDonationBoxView,
  DemoTransactionsView,
  DemoTransferView,
  DemoDashboardView,
} from "@/components/demos/demo-views";

type DemoId =
  | "dashboard"
  | "transfer"
  | "transactions"
  | "loans"
  | "loan-apply"
  | "festgeld"
  | "merchant"
  | "donation-boxes"
  | "donation-box"
  | "checkout"
  | "embed-checkout"
  | "payment-request"
  | "admin";

type DemoSection = {
  id: DemoId;
  label: string;
};

type DemoGroup = {
  label: string;
  items: DemoSection[];
};

const groups: DemoGroup[] = [
  {
    label: "Kundenbereich",
    items: [
      { id: "dashboard", label: "Übersicht" },
      { id: "transfer", label: "Überweisung" },
      { id: "transactions", label: "Transaktionen" },
      { id: "loans", label: "Kredite" },
      { id: "loan-apply", label: "Kredit beantragen" },
      { id: "festgeld", label: "Festgeld" },
      { id: "merchant", label: "Händler" },
      { id: "donation-boxes", label: "Spendenboxen" },
    ],
  },
  {
    label: "Zahlungen",
    items: [
      { id: "checkout", label: "Checkout" },
      { id: "embed-checkout", label: "Embedded Checkout" },
      { id: "payment-request", label: "Zahlung anfordern" },
      { id: "donation-box", label: "Spendenbox (public)" },
    ],
  },
  {
    label: "Verwaltung",
    items: [{ id: "admin", label: "Admin" }],
  },
];

const viewMeta: Record<DemoId, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Kunden-Dashboard",
    subtitle: "Der Startbildschirm im RBank Online Banking mit Kontostand, Konten und Schnellzugriff.",
  },
  transfer: {
    title: "Überweisung",
    subtitle: "Geld in EUR oder AirCoin an eine andere Kundennummer senden – mit PIN-Bestätigung.",
  },
  transactions: {
    title: "Transaktionen",
    subtitle: "Alle Ein- und Ausgänge mit Suchfunktion, Quell-Badges und AirCoin-Saldo.",
  },
  loans: {
    title: "Kredite",
    subtitle: "Übersicht über eigene Kredite inkl. nächster Rate und Restbetrag.",
  },
  "loan-apply": {
    title: "Kredit beantragen",
    subtitle: "Kreditprodukt auswählen, Betrag und Laufzeit festlegen – inkl. Ratenvorschau.",
  },
  festgeld: {
    title: "Festgeld",
    subtitle: "Festgeldkonten mit Zinssatz, Laufzeit und Live-Countdown bis zur Auszahlung.",
  },
  merchant: {
    title: "Händler",
    subtitle: "Deine zugewiesenen Händler mit Zahlungseingängen und Rückerstattungs-Option.",
  },
  "donation-boxes": {
    title: "Spendenboxen",
    subtitle: "Eigene Spendenboxen erstellen und alle Boxen im Netzwerk entdecken.",
  },
  checkout: {
    title: "RBank Checkout",
    subtitle: "Der öffentliche Bezahllink eines Händlers – Betrag prüfen, PIN bestätigen.",
  },
  "embed-checkout": {
    title: "Embedded Checkout",
    subtitle: "In die Seite des Händlers eingebetteter Checkout mit Nutzerauswahl und PIN.",
  },
  "payment-request": {
    title: "Zahlung anfordern",
    subtitle: "Per QR-Code geteilter Zahlungslink – Betrag eingeben, PIN bestätigen.",
  },
  "donation-box": {
    title: "Spendenbox (public)",
    subtitle: "Öffentliche Spendenseite mit Betrag, optionaler Nachricht und RBank-Login.",
  },
  admin: {
    title: "Admin-Panel",
    subtitle: "Komplette Bank-Verwaltung: Kunden, Buchungen, Festgeld, Kredite, Händler und AirCoin.",
  },
};

const viewComponents: Record<DemoId, React.ComponentType> = {
  dashboard: DemoDashboardView,
  transfer: DemoTransferView,
  transactions: DemoTransactionsView,
  loans: DemoLoansView,
  "loan-apply": DemoLoanApplyView,
  festgeld: DemoFestgeldView,
  merchant: DemoMerchantView,
  "donation-boxes": DemoDonationBoxesView,
  checkout: DemoCheckoutView,
  "embed-checkout": DemoEmbeddedCheckoutView,
  "payment-request": DemoPaymentRequestView,
  "donation-box": DemoPublicDonationBoxView,
  admin: DemoAdminView,
};

const flattenedItems = groups.flatMap((group) => group.items);

function normalizeView(view: string | undefined): DemoId {
  if (view && flattenedItems.some((item) => item.id === view)) {
    return view as DemoId;
  }
  return "dashboard";
}

type DemoShellProps = {
  initialView?: string;
  embed?: boolean;
};

export function DemoShell({ initialView, embed = false }: DemoShellProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<DemoId>(() => normalizeView(initialView));
  const ActiveView = viewComponents[activeId];
  const meta = viewMeta[activeId];
  const flattened = useMemo(
    () => groups.flatMap((group) => group.items),
    [],
  );
  const activeIndex = flattened.findIndex((item) => item.id === activeId);

  function selectView(id: DemoId) {
    setActiveId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const params = new URLSearchParams();
    params.set("view", id);
    if (embed) {
      params.set("embed", "1");
    }
    router.replace(`/demos?${params.toString()}`, { scroll: false });
  }

  function goNext() {
    const next = flattened[(activeIndex + 1) % flattened.length];
    selectView(next.id);
  }

  function goPrev() {
    const next = flattened[(activeIndex - 1 + flattened.length) % flattened.length];
    selectView(next.id);
  }

  if (embed) {
    return (
<div className="min-h-screen bg-surface text-on-surface">
        <div className="relative">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
            <ActiveView />
          </div>
          <span className="pointer-events-none fixed bottom-3 right-3 z-50 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />
            RBank Demo
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
        <DemoTopBar activeId={activeId} onSelect={selectView} />

        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <header className="mx-auto mb-8 flex max-w-5xl flex-wrap items-end justify-between gap-6">
            <div>
              <div className="glass-card mesh-gradient inline-flex items-center gap-2 rounded-full px-4 py-1.5">
                <span className="material-symbols-outlined text-sm text-primary">visibility</span>
                <span className="font-label-sm text-label-sm text-primary">RBank · Demo</span>
              </div>
              <h1 className="font-display-lg-mobile text-display-lg-mobile mt-4 text-on-surface sm:text-5xl">
                {meta.title}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-on-surface-variant">
                {meta.subtitle}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="font-label-sm text-label-sm text-on-surface">Demo-Ansicht</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-surface-container px-3 py-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Nur Vorschau
                  </span>
                </span>
              </div>
            </div>

            <div className="flex w-full items-center justify-between gap-4 lg:w-auto lg:flex-col lg:items-end">
              <p className="hidden text-[11px] font-bold uppercase tracking-[0.28em] text-on-surface-variant/70 lg:block">
                Ansichten durchblättern
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  className="group glass-card inline-flex h-14 items-center gap-2 rounded-full px-5 text-sm font-semibold text-on-surface transition-all hover:bg-surface-container active:scale-[0.97]"
                  aria-label="Vorherige Ansicht"
                >
                  <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-0.5">arrow_back</span>
                  <span className="hidden sm:inline">Zurück</span>
                </button>
                <span className="glass-card inline-flex h-14 min-w-[4.5rem] items-center justify-center rounded-full px-3 font-label-sm text-label-sm text-primary">
                  {activeIndex + 1}
                  <span className="mx-1 text-on-surface-variant/70">/</span>
                  <span className="text-on-surface-variant">{flattened.length}</span>
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  className="group glass-card inline-flex h-14 items-center gap-2 rounded-full px-5 text-sm font-semibold text-on-surface transition-all hover:bg-surface-container active:scale-[0.97]"
                  aria-label="Nächste Ansicht"
                >
                  <span className="hidden sm:inline">Weiter</span>
                  <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-5xl">
            <ActiveView />
          </div>

          <div className="mx-auto mt-10 flex max-w-5xl items-center justify-between gap-4 border-t border-white/10 pt-8">
            <PrevNextButton direction="prev" activeId={activeId} onSelect={selectView} />
            <div className="text-center">
              <p className="font-label-sm text-label-sm text-on-surface-variant/70">
                Ansicht durchblättern
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {activeIndex + 1} / {flattened.length} · {meta.title}
              </p>
            </div>
            <PrevNextButton direction="next" activeId={activeId} onSelect={selectView} />
          </div>
        </main>
    </div>
  );
}

function PrevNextButton({
  direction,
  activeId,
  onSelect,
}: {
  direction: "prev" | "next";
  activeId: DemoId;
  onSelect: (id: DemoId) => void;
}) {
  const flattened = groups.flatMap((group) => group.items);
  const activeIndex = flattened.findIndex((item) => item.id === activeId);
  const isPrev = direction === "prev";
  const target = flattened[
    (activeIndex + (isPrev ? -1 : 1) + flattened.length) % flattened.length
  ];

  return (
    <button
      type="button"
      onClick={() => {
        onSelect(target.id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className={cn(
        "group glass-card inline-flex max-w-[45%] items-center gap-3 rounded-full px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-surface-container",
      )}
      aria-label={isPrev ? "Vorherige Ansicht" : "Nächste Ansicht"}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform",
          isPrev
            ? "bg-primary-container text-white shadow-lg shadow-primary-container/40 group-hover:-translate-x-0.5"
            : "bg-primary-container text-white shadow-lg shadow-primary-container/40 group-hover:translate-x-0.5",
        )}
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
      </span>
      <span className="min-w-0">
        <span className="font-label-sm text-label-sm block text-on-surface-variant/70">
          {isPrev ? "Zurück" : "Weiter"}
        </span>
        <span className="block truncate text-sm font-bold text-on-surface">
          {target.label}
        </span>
      </span>
    </button>
  );
}

function DemoTopBar({
  activeId,
  onSelect,
}: {
  activeId: DemoId;
  onSelect: (id: DemoId) => void;
}) {
  return (
<div className="sticky top-0 z-40 border-b border-white/10 bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 py-4">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-container to-secondary-container shadow-lg shadow-primary-container/40">
              <span className="material-symbols-outlined text-lg text-white">account_balance</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-primary">RBANK</p>
              <p className="text-sm font-bold text-on-surface">Demo</p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 overflow-x-auto lg:flex">
            {groups.map((group) => (
              <div key={group.label} className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm px-1 text-on-surface-variant/60">{group.label}</span>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={cn(
                      "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      activeId === item.id
                        ? "bg-primary-container text-white"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <span className="glass-card ml-auto hidden rounded-full px-3 py-1 lg:inline-block">
            <span className="font-label-sm text-label-sm text-primary">Preview</span>
          </span>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-3 lg:hidden">
          {flattenedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                activeId === item.id
                  ? "bg-primary-container text-white"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
