import type { Route } from "next";
import Link from "next/link";
import { formatGermanDate } from "@/lib/date";
import { formatEuroFromCents } from "@/lib/money";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import {
  calculateFestgeldInterestCents,
} from "@/lib/festgeld";
import { settleCustomerAccounting } from "@/lib/customer-accounting";

export default async function FestgeldPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  await settleCustomerAccounting(user.id);

  const festgeldAccounts = await prisma.festgeldAccount.findMany({
    where: { userId: user.id },
    orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
  });

  const totalAmount = festgeldAccounts
    .filter((a) => a.status !== "PAID_OUT")
    .reduce((sum, a) => sum + a.amount, 0);

  const activeCount = festgeldAccounts.filter(
    (a) => a.status === "ACTIVE",
  ).length;

  return (
    <div className="space-y-8 pb-8">
      {/* Summary Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent px-6 pb-8 pt-8 sm:px-8 sm:pt-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl sm:h-56 sm:w-56" />
        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-amber-400/80">
          Festgeld gesamt
        </p>
        <p className="relative mt-3 text-5xl font-display tracking-tight text-slate-100 sm:text-6xl">
          {formatEuroFromCents(totalAmount)}
        </p>
        <div className="relative mt-6 flex gap-6 text-sm">
          <div>
            <p className="text-slate-400">Aktive Konten</p>
            <p className="mt-1 font-semibold text-slate-100">{activeCount}</p>
          </div>
          <div>
            <p className="text-slate-400">Gesamt</p>
            <p className="mt-1 font-semibold text-slate-100">
              {festgeldAccounts.length}
            </p>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          Konten
        </p>
        {festgeldAccounts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-10 text-center">
            <p className="text-sm text-slate-400">Keine Festgeldkonten.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {festgeldAccounts.map((account) => {
              const interestCents = calculateFestgeldInterestCents(
                account.amount,
                account.interestRate,
                account.startDate,
                account.endDate,
              );

              return (
                <Link
                  key={account.id}
                  href={`/dashboard/festgeld/${account.id}` as Route}
                  className="block"
                >
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 transition-colors hover:border-amber-500/30 hover:bg-slate-900/70">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-100">
                          {account.label}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            account.status === "UNLOCKED"
                              ? "bg-primary/10 text-primary"
                              : account.status === "PAID_OUT"
                                ? "bg-slate-800 text-slate-400"
                                : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {account.status === "UNLOCKED"
                            ? "Frei"
                            : account.status === "PAID_OUT"
                              ? "Ausgezahlt"
                              : "Aktiv"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatGermanDate(account.startDate)} –{" "}
                        {formatGermanDate(account.endDate)} ·{" "}
                        {account.interestRate.toFixed(2)}%
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-slate-100">
                        {formatEuroFromCents(account.amount)}
                      </p>
                      {interestCents > 0 && (
                        <p className="mt-1 text-xs text-amber-400">
                          +{formatEuroFromCents(interestCents)} Zins
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
