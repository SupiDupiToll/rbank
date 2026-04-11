import type { Route } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatEuroFromCents } from "@/lib/money";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  const [incoming, outgoing, savings] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "INCOMING" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "OUTGOING" },
      _sum: { amount: true },
    }),
    prisma.festgeldAccount.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
  ]);

  const balanceCents =
    (incoming._sum.amount ?? 0) - (outgoing._sum.amount ?? 0);
  const savingsTotal = savings._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Übersicht
        </p>
        <h2 className="mt-2 text-3xl font-display text-slate-100">Dashboard</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-400">Kontostand</p>
          <p className="mt-3 text-3xl font-display text-slate-100">
            {formatEuroFromCents(balanceCents)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Festgeld gesamt</p>
          <p className="mt-3 text-3xl font-display text-slate-100">
            {formatEuroFromCents(savingsTotal)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Kundennummer</p>
          <p className="mt-3 text-3xl font-display text-primary">
            {user.customerId}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 transition-colors hover:border-primary/40"
          href={"/dashboard/transfer" as Route}
        >
          <p className="text-lg font-semibold text-slate-100">Überweisung</p>
        </Link>
        <Link
          className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 transition-colors hover:border-primary/40"
          href={"/dashboard/receive-payment" as Route}
        >
          <p className="text-lg font-semibold text-slate-100">
            Zahlung entgegennehmen
          </p>
        </Link>
        <Link
          className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 transition-colors hover:border-primary/40"
          href={"/dashboard/transactions" as Route}
        >
          <p className="text-lg font-semibold text-slate-100">Transaktionen</p>
        </Link>
        <Link
          className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 transition-colors hover:border-primary/40"
          href={"/dashboard/festgeld" as Route}
        >
          <p className="text-lg font-semibold text-slate-100">Festgeld</p>
        </Link>
        <Link
          className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 transition-colors hover:border-primary/40"
          href={"/dashboard/settings" as Route}
        >
          <p className="text-lg font-semibold text-slate-100">Einstellungen</p>
        </Link>
      </div>
    </div>
  );
}
