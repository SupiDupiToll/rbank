import { Input } from "@/components/ui/input";
import { formatGermanDate } from "@/lib/date";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { CACHE_TTL, pageCacheKeys, remember } from "@/lib/cache";

type TransactionsPageProps = {
  searchParams: Promise<{ q?: string }>;
};

const sourceLabels = {
  ADMIN: "Admin",
  TRANSFER: "P2P",
  CHECKOUT: "Checkout",
  DONATION: "Spende",
  REFUND: "Refund",
  OVERDRAFT_INTEREST: "Dispozins",
  LOAN_DISBURSEMENT: "Kredit",
  LOAN_REPAYMENT: "Rate",
  CARD_TOPUP: "Karte",
  PAYOUT: "Auszahlung",
} as const;

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
    case "PAYOUT":
      return "payments";
    default:
      return "receipt_long";
  }
}

const sourceTint: Record<string, string> = {
  TRANSFER: "text-primary",
  DONATION: "text-tertiary",
  CHECKOUT: "text-secondary",
  REFUND: "text-secondary",
  LOAN_DISBURSEMENT: "text-secondary",
  LOAN_REPAYMENT: "text-primary",
  OVERDRAFT_INTEREST: "text-error",
  ADMIN: "text-on-surface-variant",
  PAYOUT: "text-secondary",
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  const { q = "" } = await searchParams;
  const query = q.trim();

  const transactions = await remember(
    pageCacheKeys.transactions(user.id, query),
    CACHE_TTL.page,
    async () => {
      await settleCustomerAccounting(user.id);

      return prisma.transaction.findMany({
        where: {
          userId: user.id,
          ...(query
            ? {
                description: {
                  contains: query,
                  mode: "insensitive",
                },
              }
            : {}),
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });
    },
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Search (sticky) */}
      <form
        method="get"
        className="sticky top-[7.5rem] z-30 -mx-5 bg-background/90 px-5 py-3 backdrop-blur-lg md:-mx-8 md:px-8"
      >
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <Input
            className="pl-12"
            defaultValue={query}
            name="q"
            placeholder="Suchen…"
          />
        </div>
      </form>

      {/* Transactions List */}
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">
              receipt_long
            </span>
            <p className="mt-3 text-sm text-on-surface-variant">
              Keine Transaktionen.
            </p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="glass-card flex items-center justify-between gap-4 rounded-2xl p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="glass-card flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <span
                      className={`material-symbols-outlined text-lg ${
                        sourceTint[transaction.source] ?? "text-on-surface-variant"
                      }`}
                    >
                      {sourceIcon(transaction.source)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-on-surface">
                      {transaction.description}
                    </p>
                    <p className="font-label-sm text-label-sm mt-0.5 text-on-surface-variant">
                      {formatGermanDate(transaction.date)} ·{" "}
                      {sourceLabels[transaction.source] ?? "Bank"} ·{" "}
                      {transaction.currency}
                    </p>
                  </div>
                </div>
              </div>
              <p
                className={`font-body-md text-body-md shrink-0 font-bold ${
                  transaction.type === "INCOMING" ? "text-secondary" : "text-error"
                }`}
              >
                {transaction.type === "INCOMING" ? "+" : "-"}
                {(
                  transaction.currency === "AIR"
                    ? formatAirFromUnits(transaction.amount)
                    : formatEuroFromCents(transaction.amount)
                ).replace("-", "")}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}