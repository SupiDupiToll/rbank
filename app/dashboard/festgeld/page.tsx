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
      <div className="glass-card mesh-gradient relative overflow-hidden rounded-xl p-6">
        <p className="font-label-sm text-label-sm text-tertiary">
          Festgeld gesamt
        </p>
        <p className="font-balance-display text-balance-display mt-3 tracking-tight text-on-surface">
          {formatEuroFromCents(totalAmount)}
        </p>
        <div className="mt-6 flex gap-8">
          <div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Aktive Konten
            </p>
            <p className="mt-1 font-semibold text-on-surface">{activeCount}</p>
          </div>
          <div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Gesamt
            </p>
            <p className="mt-1 font-semibold text-on-surface">
              {festgeldAccounts.length}
            </p>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div>
        <p className="font-label-sm text-label-sm mb-4 text-on-surface-variant">
          Konten
        </p>
        {festgeldAccounts.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">
              savings
            </span>
            <p className="mt-3 text-sm text-on-surface-variant">
              Keine Festgeldkonten.
            </p>
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
                  <div className="glass-card flex items-center justify-between gap-4 rounded-2xl p-5 transition-colors hover:bg-surface-container">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-on-surface">
                          {account.label}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            account.status === "UNLOCKED"
                              ? "bg-primary-container/20 text-primary"
                              : account.status === "PAID_OUT"
                                ? "bg-surface-container-highest text-on-surface-variant"
                                : "bg-tertiary-container/30 text-tertiary"
                          }`}
                        >
                          {account.status === "UNLOCKED"
                            ? "Frei"
                            : account.status === "PAID_OUT"
                              ? "Ausgezahlt"
                              : "Aktiv"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {formatGermanDate(account.startDate)} –{" "}
                        {formatGermanDate(account.endDate)} ·{" "}
                        {account.interestRate.toFixed(2)}%
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-on-surface">
                        {formatEuroFromCents(account.amount)}
                      </p>
                      {interestCents > 0 && (
                        <p className="mt-1 text-xs text-tertiary">
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