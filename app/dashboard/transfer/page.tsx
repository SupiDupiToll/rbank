import type { Route } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CustomerTransferForm } from "@/components/customer-transfer-form";
import { formatGermanDate } from "@/lib/date";
import { formatEuroFromCents } from "@/lib/money";
import { getCurrentAppUser } from "@/lib/current-user";
import { getCustomerDashboardData } from "@/lib/customer-dashboard";

export default async function TransferPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  const { balanceCents, transactions } = await getCustomerDashboardData(user.id);
  const recentTransfers = transactions.filter((transaction) => transaction.source === "TRANSFER").slice(0, 5);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Überweisung</p>
        <h2 className="mt-2 text-3xl font-display text-slate-100">Senden</h2>
        <div className="mt-8">
          <CustomerTransferForm balanceCents={balanceCents} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display text-slate-100">Letzte P2P-Transfers</h3>
          <Link className="text-sm font-semibold text-primary" href={"/dashboard/transactions?q=%C3%9Cberweisung" as Route}>
            Verlauf
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          {recentTransfers.length === 0 ? (
            <p className="text-sm text-slate-400">Keine Überweisungen.</p>
          ) : (
            recentTransfers.map((transaction) => (
              <div key={transaction.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="font-semibold text-slate-100">{transaction.description}</p>
                <p className="mt-1 text-sm text-slate-400">{formatGermanDate(transaction.date)}</p>
                <p className={`mt-3 font-bold ${transaction.type === "INCOMING" ? "text-primary" : "text-red-400"}`}>
                  {transaction.type === "INCOMING" ? "+" : "-"}
                  {formatEuroFromCents(transaction.amount).replace("-", "")}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
