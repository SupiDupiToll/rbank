import type { Route } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FestgeldCountdown } from "@/components/festgeld-countdown";
import { formatGermanDate } from "@/lib/date";
import { formatEuroFromCents } from "@/lib/money";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { calculateFestgeldInterestCents, settleMaturedFestgeldAccounts } from "@/lib/festgeld";

export default async function FestgeldPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  await settleMaturedFestgeldAccounts(user.id);

  const festgeldAccounts = await prisma.festgeldAccount.findMany({
    where: { userId: user.id },
    orderBy: [{ endDate: "asc" }, { createdAt: "desc" }]
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Festgeld</p>
        <h2 className="mt-2 text-3xl font-display text-slate-100">Konten</h2>
      </header>

      {festgeldAccounts.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">Keine Konten.</p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {festgeldAccounts.map((account) => (
            <Link key={account.id} className="block" href={`/dashboard/festgeld/${account.id}` as Route}>
              <Card className="space-y-4 transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-display text-slate-100">{account.label}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    {formatGermanDate(account.startDate)} bis {formatGermanDate(account.endDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{formatEuroFromCents(account.amount)}</p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${
                      account.status === "UNLOCKED"
                        ? "bg-primary/10 text-primary"
                        : account.status === "PAID_OUT"
                          ? "bg-slate-800 text-slate-300"
                          : "bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {account.status === "UNLOCKED" ? "Unlocked" : account.status === "PAID_OUT" ? "Ausgezahlt" : "Aktiv"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-lg font-semibold text-slate-100">{account.interestRate.toFixed(2)}%</p>
                <p className="mt-2 text-sm text-slate-400">
                  Zins{" "}
                  {formatEuroFromCents(
                    calculateFestgeldInterestCents(account.amount, account.interestRate, account.startDate, account.endDate)
                  )}
                </p>
              </div>

              <FestgeldCountdown endDate={account.endDate.toISOString()} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
