import type { Route } from "next";
import Link from "next/link";
import { getBalancesByCurrency } from "@/lib/banking";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { getCurrentAppUser } from "@/lib/current-user";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const sourceLabels: Record<string, string> = {
  ADMIN: "Bank",
  TRANSFER: "P2P",
  CHECKOUT: "Shopping",
  DONATION: "Spende",
  REFUND: "Erstattung",
  OVERDRAFT_INTEREST: "Dispozins",
  LOAN_DISBURSEMENT: "Kredit",
  LOAN_REPAYMENT: "Rate",
  CARD_TOPUP: "Karte",
};

function sourceIcon(source: string): string {
  switch (source) {
    case "TRANSFER":
      return "swap_horiz";
    case "CHECKOUT":
      return "shopping_bag";
    case "DONATION":
      return "volunteer_activism";
    case "REFUND":
      return "assignment_return";
    case "LOAN_DISBURSEMENT":
      return "savings";
    case "LOAN_REPAYMENT":
      return "payments";
    case "OVERDRAFT_INTEREST":
      return "percent";
    case "CARD_TOPUP":
      return "credit_card";
    default:
      return "receipt_long";
  }
}

const heroActions = [
  {
    href: "/dashboard/transfer" as Route,
    label: "Überweisen",
    icon: "send",
    primary: true,
  },
  {
    href: "/dashboard/receive-payment" as Route,
    label: "Empfangen",
    icon: "qr_code_scanner",
  },
  {
    href: "/dashboard/transactions" as Route,
    label: "Verlauf",
    icon: "receipt_long",
  },
  {
    href: "/dashboard/festgeld" as Route,
    label: "Festgeld",
    icon: "savings",
  },
];

export default async function DashboardPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  await settleCustomerAccounting(user.id);

  const [transactions, savings, loans, recentTransactions] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId: user.id },
        select: { type: true, amount: true, currency: true },
      }),
      prisma.festgeldAccount.aggregate({
        where: { userId: user.id },
        _sum: { amount: true },
      }),
      prisma.loan.aggregate({
        where: { userId: user.id, status: "ACTIVE" },
        _sum: { remainingAmount: true },
      }),
      prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          description: true,
          type: true,
          amount: true,
          currency: true,
          source: true,
          date: true,
        },
      }),
    ]);

  const { eurBalanceCents, airBalance } = getBalancesByCurrency(transactions);
  const savingsTotal = savings._sum.amount ?? 0;
  const loanDebt = loans._sum.remainingAmount ?? 0;
  const totalCents = eurBalanceCents + savingsTotal - loanDebt;

  const moreActions = [
    {
      href: "/dashboard/kredite" as Route,
      label: "Kredite",
      icon: "request_quote",
    },
    {
      href: "/dashboard/haendler" as Route,
      label: "Händler",
      icon: "storefront",
    },
    {
      href: "/dashboard/karte" as Route,
      label: "Karte",
      icon: "credit_card",
    },
    ...(user.showDonationBoxesList
      ? [
          {
            href: "/dashboard/spendenboxen" as Route,
            label: "Spendenboxen",
            icon: "volunteer_activism",
          },
        ]
      : []),
    {
      href: "/dashboard/settings" as Route,
      label: "Einstellungen",
      icon: "settings",
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Main Balance Area */}
      <section className="flex flex-col items-center justify-center text-center">
        <div className="glass-card mb-2 flex items-center gap-2 rounded-full px-4 py-1.5 text-on-surface-variant">
          <span className="material-symbols-outlined text-sm text-primary">
            account_balance_wallet
          </span>
          <span className="font-label-sm text-label-sm">Girokonto · EUR</span>
          <span className="material-symbols-outlined text-sm">
            keyboard_arrow_down
          </span>
        </div>

        <h2 className="font-balance-display text-balance-display mb-8 tracking-tight text-on-surface">
          {formatEuroFromCents(totalCents)}
        </h2>

        {/* Quick Actions Row */}
        <div className="flex w-full max-w-md items-start justify-between px-2">
          {heroActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col items-center gap-2"
            >
              <span
                className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full transition-transform group-active:scale-95 ${
                  action.primary
                    ? "bg-primary-container text-white shadow-[0_0_20px_rgba(127,61,255,0.4)]"
                    : "glass-card text-on-surface"
                }`}
              >
                <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="material-symbols-outlined text-xl">
                  {action.icon}
                </span>
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Bento Grid */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Promotional Card */}
        <div className="glass-card mesh-gradient group relative flex h-48 cursor-pointer flex-col justify-end overflow-hidden p-6 md:h-64">
          <div className="absolute -right-10 -top-10 flex h-48 w-48 items-center justify-center opacity-80">
            <span className="material-symbols-outlined text-[7rem] text-primary/60 transition-transform duration-500 group-hover:scale-105">
              account_balance
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="font-headline-md text-headline-md mb-2 text-on-surface">
              RBank 2.0 ist da
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Entdecke das neue Design.
            </p>
          </div>
        </div>

        {/* Recent Transactions Card */}
        <div className="glass-card flex flex-col p-6 md:h-64">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Letzte Aktivitäten
            </h3>
            <Link
              href={"/dashboard/transactions" as Route}
              className="material-symbols-outlined text-on-surface-variant transition-colors hover:text-primary"
            >
              arrow_forward
            </Link>
          </div>
          <div className="hide-scrollbar flex grow flex-col gap-4 overflow-y-auto">
            {recentTransactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-on-surface-variant">
                Noch keine Transaktionen.
              </p>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={`${transaction.date.getTime()}-${transaction.amount}-${transaction.description}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="glass-card flex h-10 w-10 items-center justify-center rounded-full">
                      <span className="material-symbols-outlined text-lg text-primary">
                        {sourceIcon(transaction.source)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-md text-body-md leading-tight text-on-surface">
                        {transaction.description}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {sourceLabels[transaction.source] ?? "Bank"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`font-body-md text-body-md font-semibold ${
                      transaction.type === "INCOMING"
                        ? "text-secondary"
                        : "text-on-surface"
                    }`}
                  >
                    {transaction.type === "INCOMING" ? "+" : "-"}
                    {(
                      transaction.currency === "AIR"
                        ? formatAirFromUnits(transaction.amount)
                        : formatEuroFromCents(transaction.amount)
                    ).replace("-", "")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Accounts */}
      <section>
        <p className="font-label-sm text-label-sm mb-4 text-on-surface-variant">
          Konten
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass-card mesh-gradient relative overflow-hidden p-6 transition-colors">
            <div className="mb-10 flex items-center gap-3">
              <div className="glass-card flex h-10 w-10 items-center justify-center rounded-full">
                <span className="material-symbols-outlined text-primary">euro</span>
              </div>
              <span className="font-headline-md text-headline-md text-on-surface">
                Euro
              </span>
            </div>
            <div className="font-balance-display text-balance-display text-on-surface">
              {formatEuroFromCents(eurBalanceCents)}
            </div>
            <p className="font-label-sm text-label-sm mt-2 text-on-surface-variant">
              Available Balance
            </p>
          </div>
          <div className="glass-card mesh-gradient relative overflow-hidden p-6 transition-colors">
            <div className="mb-10 flex items-center gap-3">
              <div className="glass-card flex h-10 w-10 items-center justify-center rounded-full">
                <span className="material-symbols-outlined text-secondary">
                  currency_bitcoin
                </span>
              </div>
              <span className="font-headline-md text-headline-md text-on-surface">
                AirCoin
              </span>
            </div>
            <div className="font-balance-display text-balance-display text-on-surface">
              {formatAirFromUnits(airBalance)}
            </div>
            <p className="font-label-sm text-label-sm mt-2 text-on-surface-variant">
              Kleine eigene Währung :D
            </p>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section>
        <p className="font-label-sm text-label-sm mb-4 text-on-surface-variant">
          Mehr
        </p>
        <div className="grid grid-cols-2 gap-3">
          {moreActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="glass-card flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-xl text-primary">
                {action.icon}
              </span>
              <span className="text-sm font-semibold text-on-surface">
                {action.label}
              </span>
            </Link>
          ))}
          <div className="glass-card flex items-center gap-3 rounded-2xl p-4">
            <span className="material-symbols-outlined text-xl text-on-surface-variant">
              badge
            </span>
            <div>
              <p className="text-xs text-on-surface-variant">Kundennummer</p>
              <p className="font-mono text-sm tracking-widest text-on-surface">
                {user.customerId}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}