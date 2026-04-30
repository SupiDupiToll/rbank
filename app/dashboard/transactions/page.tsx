import { Input } from "@/components/ui/input";
import { formatGermanDate } from "@/lib/date";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type TransactionsPageProps = {
  searchParams: Promise<{ q?: string }>;
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
        <div className="rounded-2xl bg-primary/10 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
            Eingänge
          </p>
          <p className="mt-2 text-3xl font-display text-primary">
            +{formatEuroFromCents(incoming)}
          </p>
        </div>
        <div className="rounded-2xl bg-red-500/10 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-400/80">
            Ausgänge
          </p>
          <p className="mt-2 text-3xl font-display text-red-400">
            -{formatEuroFromCents(outgoing)}
          </p>
        </div>
        <div className="rounded-2xl bg-sky-500/10 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-200/80">
            AirCoin
          </p>
          <p className="mt-2 text-3xl font-display text-sky-200">
            {formatAirFromUnits(airNet)}
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="get" className="w-full">
        <Input defaultValue={query} name="q" placeholder="Suchen…" />
      </form>

      {/* Transactions List */}
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-10 text-center">
            <p className="text-sm text-slate-400">Keine Transaktionen.</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-100">
                    {transaction.description}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      transaction.source === "TRANSFER"
                        ? "bg-primary/10 text-primary"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {transaction.source === "TRANSFER" ? "P2P" : "Admin"}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    {transaction.currency}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatGermanDate(transaction.date)}
                </p>
              </div>
              <p
                className={`shrink-0 font-bold ${
                  transaction.type === "INCOMING"
                    ? "text-primary"
                    : "text-red-400"
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
