import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatGermanDate } from "@/lib/date";
import { formatEuroFromCents } from "@/lib/money";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { settleMaturedFestgeldAccounts } from "@/lib/festgeld";

type TransactionsPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  const { q = "" } = await searchParams;
  const query = q.trim();

  await settleMaturedFestgeldAccounts(user.id);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      ...(query
        ? {
            description: {
              contains: query,
              mode: "insensitive"
            }
          }
        : {})
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  return (
    <Card>
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Transaktionen</p>
          <h2 className="mt-2 text-3xl font-display text-slate-100">Buchungen durchsuchen</h2>
        </div>
        <form className="w-full max-w-md" method="get">
          <Input defaultValue={query} name="q" placeholder="Beschreibung durchsuchen" />
        </form>
      </div>

      <div className="mt-6 space-y-3">
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400">Keine Transaktionen für diese Suche gefunden.</p>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-100">{transaction.description}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${transaction.source === "TRANSFER" ? "bg-primary/10 text-primary" : "bg-slate-800 text-slate-300"}`}>
                    {transaction.source === "TRANSFER" ? "P2P" : "Admin"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{formatGermanDate(transaction.date)}</p>
              </div>
              <div className="text-left md:text-right">
                <p className={transaction.type === "INCOMING" ? "font-bold text-primary" : "font-bold text-red-400"}>
                  {transaction.type === "INCOMING" ? "+" : "-"}
                  {formatEuroFromCents(transaction.amount).replace("-", "")}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{transaction.type === "INCOMING" ? "Eingang" : "Ausgang"}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
