import type { Route } from "next";
import Link from "next/link";
import { formatEuroFromCents } from "@/lib/money";
import { formatGermanDate } from "@/lib/date";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { settleCustomerAccounting } from "@/lib/customer-accounting";

const statusLabels: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Beantragt",
    className: "bg-tertiary-container/30 text-tertiary",
  },
  ACTIVE: { label: "Aktiv", className: "bg-primary-container/20 text-primary" },
  COMPLETED: {
    label: "Abbezahlt",
    className: "bg-surface-container-highest text-on-surface-variant",
  },
  REJECTED: {
    label: "Abgelehnt",
    className: "bg-error-container/30 text-error",
  },
  CANCELLED: {
    label: "Storniert",
    className: "bg-surface-container-highest text-on-surface-variant",
  },
};

export default async function KreditePage() {
  const user = await getCurrentAppUser();
  if (!user) return null;

  await settleCustomerAccounting(user.id);

  const loans = await prisma.loan.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      loanProduct: { select: { name: true } },
    },
  });

  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  const totalRemaining = activeLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
  const totalBorrowed = activeLoans.reduce((sum, l) => sum + l.amount, 0);
  const nextPayment = activeLoans.length > 0
    ? await prisma.loanPayment.findFirst({
        where: {
          loanId: { in: activeLoans.map((l) => l.id) },
          status: "SCHEDULED",
        },
        orderBy: { scheduledDate: "asc" },
        include: { loan: { include: { loanProduct: { select: { name: true } } } } },
      })
    : null;

  return (
    <div className="space-y-8 pb-8">
      <div className="glass-card mesh-gradient relative overflow-hidden rounded-xl p-6">
        <p className="font-label-sm text-label-sm text-primary">
          Kredite gesamt
        </p>
        <p className="font-balance-display text-balance-display mt-3 tracking-tight text-on-surface">
          {formatEuroFromCents(totalBorrowed)}
        </p>
        <div className="mt-6 flex gap-8">
          <div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Offener Betrag
            </p>
            <p className="mt-1 font-semibold text-on-surface">
              {formatEuroFromCents(totalRemaining)}
            </p>
          </div>
          <div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Aktive Kredite
            </p>
            <p className="mt-1 font-semibold text-on-surface">
              {activeLoans.length}
            </p>
          </div>
        </div>
      </div>

      {nextPayment ? (
        <div className="glass-card rounded-2xl border-tertiary/30 p-5">
          <p className="font-label-sm text-label-sm text-tertiary">
            Naechste Rate
          </p>
          <p className="mt-2 text-lg font-semibold text-on-surface">
            {formatEuroFromCents(nextPayment.amount)} am{" "}
            {formatGermanDate(nextPayment.scheduledDate)}
          </p>
          <p className="text-sm text-on-surface-variant">
            {nextPayment.loan.loanProduct?.name ?? "Kredit"} · Rate{" "}
            {nextPayment.installmentNumber}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Meine Kredite
        </p>
        <Link
          href={"/dashboard/kredite/beantragen" as Route}
          className="bg-primary-container glow-effect flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Beantragen
        </Link>
      </div>

      {loans.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">
            request_quote
          </span>
          <p className="mt-3 text-sm text-on-surface-variant">
            Noch keine Kredite.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => {
            const status = statusLabels[loan.status] ?? statusLabels.PENDING;
            return (
              <Link
                key={loan.id}
                href={`/dashboard/kredite/${loan.id}` as Route}
                className="block"
              >
                <div className="glass-card flex items-center justify-between gap-4 rounded-2xl p-5 transition-colors hover:bg-surface-container">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-on-surface">
                        {loan.loanProduct?.name ?? "Kredit"}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {loan.termMonths} Monate ·{" "}
                      {loan.interestRate.toFixed(2)}% ·{" "}
                      {formatGermanDate(loan.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-on-surface">
                      {formatEuroFromCents(loan.amount)}
                    </p>
                    {loan.status === "ACTIVE" ? (
                      <p className="mt-1 text-xs text-tertiary">
                        Rest {formatEuroFromCents(loan.remainingAmount)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}