import { Input } from "@/components/ui/input";
import { formatGermanDate } from "@/lib/date";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

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
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  await settleCustomerAccounting(user.id);

  const { q = "" } = await searchParams;
  const query = q.trim();

  const transactions = await prisma.transaction.findMany({
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

  const eurTransactions = transactions.filter(
    (transaction) => transaction.currency === "EUR",
  );
  const airTransactions = transactions.filter(
    (transaction) => transaction.currency === "AIR",
  );
  const incoming = eurTransactions
    .filter((t) => t.type === "INCOMING")
    .reduce((sum, t) => sum + t.amount, 0);
  const outgoing = eurTransactions
    .filter((t) => t.type === "OUTGOING")
    .reduce((sum, t) => sum + t.amount, 0);
  const airNet = airTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.type === "INCOMING" ? transaction.amount : -transaction.amount),
    0,
  );

  return (
    <div className="space-y-8 pb-8">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card mesh-gradient rounded-2xl p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Eingänge
          </p>
          <p className="font-balance-display text-balance-display mt-3 text-secondary">
            +{formatEuroFromCents(incoming)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Ausgänge
          </p>
          <p className="font-balance-display text-balance-display mt-3 text-error">
            -{formatEuroFromCents(outgoing)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            AirCoin
          </p>
          <p className="font-balance-display text-balance-display mt-3 text-primary">
            {formatAirFromUnits(airNet)}
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="get" className="w-full">
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