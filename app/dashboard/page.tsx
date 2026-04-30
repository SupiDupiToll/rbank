import type { Route } from "next";
import Link from "next/link";
import { getBalancesByCurrency } from "@/lib/banking";
import { getCurrentAppUser } from "@/lib/current-user";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

function HomeIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3.75 10.5 8.25-6.5 8.25 6.5v8.25a1.5 1.5 0 0 1-1.5 1.5h-4.5v-5.25h-4.5v5.25h-4.5a1.5 1.5 0 0 1-1.5-1.5V10.5Z"
      />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 7.5h12.75m0 0-3-3m3 3-3 3M19.5 16.5H6.75m0 0 3 3m-3-3 3-3"
      />
    </svg>
  );
}

function QRIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 6.75h9m-9 5.25h9m-9 5.25h5.25M5.25 4.5h13.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z"
      />
    </svg>
  );
}

function PiggyIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

function DonationBoxIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 4.5h15A1.5 1.5 0 0 1 21 6v12a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6a1.5 1.5 0 0 1 1.5-1.5Zm3 3h9m-9 4.5h9m-9 4.5h5.25"
      />
    </svg>
  );
}
const baseQuickActions = [
  {
    href: "/dashboard/transfer" as Route,
    label: "Überweisen",
    icon: TransferIcon,
  },
  {
    href: "/dashboard/receive-payment" as Route,
    label: "Empfangen",
    icon: QRIcon,
  },
  {
    href: "/dashboard/transactions" as Route,
    label: "Verlauf",
    icon: ListIcon,
  },
  { href: "/dashboard/festgeld" as Route, label: "Festgeld", icon: PiggyIcon },
  {
    href: "/dashboard/settings" as Route,
    label: "Einstellungen",
    icon: SettingsIcon,
  },
];

export default async function DashboardPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  const [transactions, savings] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      select: { type: true, amount: true, currency: true },
    }),
    prisma.festgeldAccount.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
  ]);

  const { eurBalanceCents, airBalance } = getBalancesByCurrency(transactions);
  const savingsTotal = savings._sum.amount ?? 0;
  const totalCents = eurBalanceCents + savingsTotal;
  const quickActions = [
    ...baseQuickActions.slice(0, 4),
    ...(user.showDonationBoxesList
      ? [
          {
            href: "/dashboard/spendenboxen" as Route,
            label: "Spendenboxen",
            icon: DonationBoxIcon,
          },
        ]
      : []),
    baseQuickActions[4],
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Balance Card – Revolut style */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/30 via-primary/15 to-transparent px-6 pb-10 pt-8 sm:px-8 sm:pt-10">
        {/* Decorative circle */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl sm:h-56 sm:w-56 sm:-right-16 sm:-top-16" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
          Gesamtkontostand
        </p>
        <p className="relative mt-3 text-5xl font-display tracking-tight text-slate-100 sm:text-6xl">
          {formatEuroFromCents(totalCents)}
        </p>
        <div className="relative mt-6 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-slate-400">Girokonto</p>
            <p className="mt-1 font-semibold text-slate-100">
              {formatEuroFromCents(eurBalanceCents)}
            </p>
          </div>
          <div>
            <p className="text-slate-400">AirCoin Konto</p>
            <p className="mt-1 font-semibold text-slate-100">
              {formatAirFromUnits(airBalance)}
            </p>
          </div>
          {savingsTotal > 0 && (
            <div>
              <p className="text-slate-400">Festgeld</p>
              <p className="mt-1 font-semibold text-slate-100">
                {formatEuroFromCents(savingsTotal)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          Konten
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/40 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
              Girokonto
            </p>
            <p className="mt-3 text-3xl font-display text-slate-100">
              {formatEuroFromCents(eurBalanceCents)}
            </p>
            <p className="mt-2 text-sm text-slate-400">Standardkonto in EUR</p>
          </div>
          <div className="rounded-3xl border border-sky-400/20 bg-sky-500/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-200">
              AirCoin Konto
            </p>
            <p className="mt-3 text-3xl font-display text-slate-100">
              {formatAirFromUnits(airBalance)}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Kleine eigene Währung :D
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          Schnellzugriff
        </p>
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${quickActions.length}, minmax(0, 1fr))`,
          }}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-primary transition-colors hover:bg-slate-800 hover:shadow-lg hover:shadow-primary/5">
                  <Icon />
                </span>
                <span className="truncate text-xs font-medium text-slate-400">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Kundennummer */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 px-5 py-4">
        <p className="text-xs text-slate-500">Kundennummer</p>
        <p className="mt-1 font-mono text-lg tracking-wider text-slate-200">
          {user.customerId}
        </p>
      </div>
    </div>
  );
}
