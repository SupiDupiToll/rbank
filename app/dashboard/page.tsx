import type { Route } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatGermanDate } from "@/lib/date";
import { formatEuroFromCents } from "@/lib/money";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  const [incoming, outgoing, latestTransactions, savings] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "INCOMING" },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "OUTGOING" },
      _sum: { amount: true }
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        source: true,
        date: true
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5
    }),
    prisma.festgeldAccount.aggregate({
      where: { userId: user.id },
      _sum: { amount: true }
    })
  ]);

  const balanceCents = (incoming._sum.amount ?? 0) - (outgoing._sum.amount ?? 0);
  const savingsTotal = savings._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Übersicht</p>
        <h2 className="mt-2 text-3xl font-display text-slate-100">Dashboard</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-400">Kontostand</p>
          <p className="mt-3 text-3xl font-display text-slate-100">{formatEuroFromCents(balanceCents)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Festgeld gesamt</p>
          <p className="mt-3 text-3xl font-display text-slate-100">{formatEuroFromCents(savingsTotal)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Kundennummer</p>
          <p className="mt-3 text-3xl font-display text-primary">{user.customerId}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 transition-colors hover:border-primary/40" href={"/dashboard/transfer" as Route}>
          <p className="text-lg font-semibold text-slate-100">Überweisung</p>
        </Link>
        <Link className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 transition-colors hover:border-primary/40" href={"/dashboard/receive-payment" as Route}>
          <p className="text-lg font-semibold text-slate-100">Zahlung entgegennehmen</p>
        </Link>
        <Link className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 transition-colors hover:border-primary/40" href={"/dashboard/transactions" as Route}>
          <p className="text-lg font-semibold text-slate-100">Transaktionen</p>
        </Link>
        <Link className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 transition-colors hover:border-primary/40" href={"/dashboard/festgeld" as Route}>
          <p className="text-lg font-semibold text-slate-100">Festgeld</p>
        </Link>
        <Link className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 transition-colors hover:border-primary/40" href={"/dashboard/settings" as Route}>
          <p className="text-lg font-semibold text-slate-100">Einstellungen</p>
        </Link>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-display text-slate-100">Letzte Buchungen</h3>
          <Link className="text-sm font-semibold text-primary" href={"/dashboard/transactions" as Route}>
            Alle ansehen
          </Link>
        </div>
        <div className="space-y-3">
          {latestTransactions.map((transaction) => (
            <div key={transaction.id} className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-100">{transaction.description}</p>
                <p className="mt-1 text-sm text-slate-400">{formatGermanDate(transaction.date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${transaction.source === "TRANSFER" ? "bg-primary/10 text-primary" : "bg-slate-800 text-slate-300"}`}>
                  {transaction.source === "TRANSFER" ? "P2P" : "Admin"}
                </span>
                <span className={transaction.type === "INCOMING" ? "font-bold text-primary" : "font-bold text-red-400"}>
                  {transaction.type === "INCOMING" ? "+" : "-"}
                  {formatEuroFromCents(transaction.amount).replace("-", "")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
