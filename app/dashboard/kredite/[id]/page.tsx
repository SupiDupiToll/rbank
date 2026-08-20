import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { LoanActions } from "@/components/loan-actions";
import { formatEuroFromCents } from "@/lib/money";
import { formatGermanDate } from "@/lib/date";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { settleCustomerAccounting } from "@/lib/customer-accounting";

type KreditDetailProps = {
  params: Promise<{ id: string }>;
};

const statusLabels: Record<string, string> = {
  PENDING: "Beantragt",
  ACTIVE: "Aktiv",
  COMPLETED: "Abbezahlt",
  REJECTED: "Abgelehnt",
  CANCELLED: "Storniert",
};

const statusClasses: Record<string, string> = {
  PENDING: "bg-tertiary-container/30 text-tertiary",
  ACTIVE: "bg-primary-container/20 text-primary",
  COMPLETED: "bg-surface-container-highest text-on-surface-variant",
  REJECTED: "bg-error-container/30 text-error",
  CANCELLED: "bg-surface-container-highest text-on-surface-variant",
};

export default async function KreditDetailPage({ params }: KreditDetailProps) {
  const user = await getCurrentAppUser();
  if (!user) return null;

  const { id } = await params;

  await settleCustomerAccounting(user.id);

  const loan = await prisma.loan.findFirst({
    where: { id, userId: user.id },
    include: {
      loanProduct: { select: { name: true } },
      payments: { orderBy: { installmentNumber: "asc" } },
    },
  });

  if (!loan) notFound();

  const paidCount = loan.payments.filter((p) => p.status === "PAID").length;
  const paidPrincipal = loan.payments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.principalPortion, 0);
  const paidInterest = loan.payments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.interestPortion, 0);

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        href={"/dashboard/kredite" as Route}
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Zurueck zu Krediten
      </Link>

      <Card className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-label-sm text-label-sm text-primary">
              Kredit-Detail
            </p>
            <h2 className="font-headline-md text-headline-md mt-2 text-on-surface">
              {loan.loanProduct?.name ?? "Kredit"}
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${
              statusClasses[loan.status] ??
              "bg-surface-container-highest text-on-surface-variant"
            }`}
          >
            {statusLabels[loan.status] ?? loan.status}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Kreditbetrag</p>
            <p className="font-balance-display text-balance-display mt-2 text-on-surface">
              {formatEuroFromCents(loan.amount)}
            </p>
            {loan.oneTimeFeeCents && loan.oneTimeFeeCents > 0 ? (
              <p className="mt-1 text-xs text-on-surface-variant">
                + {formatEuroFromCents(loan.oneTimeFeeCents)} Einmalgebühr
                {loan.oneTimeFeePaid ? " (bezahlt)" : ""}
              </p>
            ) : null}
          </Card>
          <Card>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Monatsrate</p>
            <p className="font-balance-display text-balance-display mt-2 text-on-surface">
              {formatEuroFromCents(loan.monthlyPayment)}
            </p>
          </Card>
          <Card>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Restbuchstand</p>
            <p className="font-balance-display text-balance-display mt-2 text-tertiary">
              {formatEuroFromCents(loan.remainingAmount)}
            </p>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass-card rounded-2xl p-5">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Zinssatz</p>
            <p className="mt-2 text-lg font-semibold text-on-surface">
              {loan.interestRate === 0 ? "Zinsfrei" : `${loan.interestRate.toFixed(2)}% p.a.`}
            </p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Laufzeit</p>
            <p className="mt-2 text-lg font-semibold text-on-surface">
              {loan.termMonths} Monate
            </p>
            <p className="text-xs text-on-surface-variant">
              {paidCount} bezahlt
            </p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Bereits gezahlt</p>
            <p className="mt-2 text-lg font-semibold text-on-surface">
              {formatEuroFromCents(paidPrincipal + paidInterest)}
            </p>
            <p className="text-xs text-on-surface-variant">
              davon Zinsen: {formatEuroFromCents(paidInterest)}
            </p>
          </div>
        </div>

        {loan.status === "ACTIVE" ? (
          <LoanActions
            loanId={loan.id}
            remainingAmount={loan.remainingAmount}
            monthlyPayment={loan.monthlyPayment}
            canPay={loan.remainingAmount > 0}
          />
        ) : loan.status === "COMPLETED" && loan.paidOffAt ? (
          <div className="glass-card rounded-2xl p-5 text-sm text-on-surface-variant">
            Kredit vollstaendig abbezahlt am{" "}
            {formatGermanDate(loan.paidOffAt)}.
          </div>
        ) : loan.status === "PENDING" ? (
          <div className="glass-card rounded-2xl border-tertiary/30 p-5 text-sm text-on-surface-variant">
            Kreditantrag wird vom Admin bearbeitet.
          </div>
        ) : null}

        {loan.status === "REJECTED" ? (
          <div className="glass-card rounded-2xl border-error/30 p-5 text-sm text-on-surface-variant">
            Kreditantrag wurde abgelehnt.
          </div>
        ) : null}
      </Card>

      {loan.payments.length > 0 ? (
        <Card>
          <h3 className="font-headline-md text-headline-md mb-4 font-bold text-on-surface">
            Tilgungsplan
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="pb-2 pr-4 font-medium">Nr.</th>
                  <th className="pb-2 pr-4 font-medium">Datum</th>
                  <th className="pb-2 pr-4 font-medium">Rate</th>
                  <th className="pb-2 pr-4 font-medium">Tilgung</th>
                  <th className="pb-2 pr-4 font-medium">Zins</th>
                  <th className="pb-2 pr-4 font-medium">Rest</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loan.payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className={`border-b border-white/5 ${
                      payment.status === "PAID" ? "text-on-surface-variant" : "text-on-surface"
                    }`}
                  >
                    <td className="py-2 pr-4">{payment.installmentNumber}</td>
                    <td className="py-2 pr-4">
                      {formatGermanDate(payment.scheduledDate)}
                    </td>
                    <td className="py-2 pr-4 font-medium">
                      {formatEuroFromCents(payment.amount)}
                    </td>
                    <td className="py-2 pr-4 text-primary">
                      {formatEuroFromCents(payment.principalPortion)}
                    </td>
                    <td className="py-2 pr-4 text-tertiary">
                      {formatEuroFromCents(payment.interestPortion)}
                    </td>
                    <td className="py-2 pr-4">
                      {formatEuroFromCents(payment.remainingBalance)}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          payment.status === "PAID"
                            ? "bg-primary-container/20 text-primary"
                            : payment.status === "LATE"
                                ? "bg-error-container/30 text-error"
                                : "bg-tertiary-container/30 text-tertiary"
                        }`}
                      >
                        {payment.status === "PAID"
                          ? "Bezahlt"
                          : payment.status === "LATE"
                              ? "Ueberfaellig"
                              : payment.scheduledDate <= new Date()
                                ? "Faellig"
                                : "Offen"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}