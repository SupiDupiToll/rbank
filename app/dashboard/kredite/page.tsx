import type { Route } from "next";
import Link from "next/link";
import { formatEuroFromCents } from "@/lib/money";
import { formatGermanDate } from "@/lib/date";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { settleCustomerAccounting } from "@/lib/customer-accounting";

const statusLabels: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Beantragt", className: "bg-amber-500/10 text-amber-300" },
  ACTIVE: { label: "Aktiv", className: "bg-primary/10 text-primary" },
  COMPLETED: { label: "Abbezahlt", className: "bg-slate-800 text-slate-300" },
  REJECTED: { label: "Abgelehnt", className: "bg-red-500/10 text-red-300" },
  CANCELLED: { label: "Storniert", className: "bg-slate-800 text-slate-400" },
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent px-6 pb-8 pt-8 sm:px-8 sm:pt-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl sm:h-56 sm:w-56" />
        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-blue-400/80">
          Kredite gesamt
        </p>
        <p className="relative mt-3 text-5xl font-display tracking-tight text-slate-100 sm:text-6xl">
          {formatEuroFromCents(totalBorrowed)}
        </p>
        <div className="relative mt-6 flex gap-6 text-sm">
          <div>
            <p className="text-slate-400">Offener Betrag</p>
            <p className="mt-1 font-semibold text-slate-100">
              {formatEuroFromCents(totalRemaining)}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Aktive Kredite</p>
            <p className="mt-1 font-semibold text-slate-100">
              {activeLoans.length}
            </p>
          </div>
        </div>
      </div>

      {nextPayment ? (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">
            Naechste Rate
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {formatEuroFromCents(nextPayment.amount)} am{" "}
            {formatGermanDate(nextPayment.scheduledDate)}
          </p>
          <p className="text-sm text-slate-400">
            {nextPayment.loan.loanProduct?.name ?? "Kredit"} · Rate{" "}
            {nextPayment.installmentNumber}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          Meine Kredite
        </p>
        <Link
          href={"/dashboard/kredite/beantragen" as Route}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-background-dark"
        >
          + Beantragen
        </Link>
      </div>

      {loans.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-10 text-center">
          <p className="text-sm text-slate-400">Noch keine Kredite.</p>
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
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 transition-colors hover:border-blue-500/30 hover:bg-slate-900/70">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-100">
                        {loan.loanProduct?.name ?? "Kredit"}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {loan.termMonths} Monate ·{" "}
                      {loan.interestRate.toFixed(2)}% ·{" "}
                      {formatGermanDate(loan.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-slate-100">
                      {formatEuroFromCents(loan.amount)}
                    </p>
                    {loan.status === "ACTIVE" ? (
                      <p className="mt-1 text-xs text-blue-400">
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
