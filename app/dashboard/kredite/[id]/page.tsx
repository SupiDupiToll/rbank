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
  const skippedCount = loan.payments.filter((p) => p.status === "SKIPPED").length;
  const paidPrincipal = loan.payments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.principalPortion, 0);
  const paidInterest = loan.payments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.interestPortion, 0);

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex text-sm font-semibold text-primary"
        href={"/dashboard/kredite" as Route}
      >
        Zurueck zu Krediten
      </Link>

      <Card className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Kredit-Detail
            </p>
            <h2 className="mt-2 text-3xl font-display text-slate-100">
              {loan.loanProduct?.name ?? "Kredit"}
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${
              loan.status === "ACTIVE"
                ? "bg-primary/10 text-primary"
                : loan.status === "COMPLETED"
                  ? "bg-slate-800 text-slate-300"
                  : loan.status === "PENDING"
                    ? "bg-amber-500/10 text-amber-300"
                    : loan.status === "REJECTED"
                      ? "bg-red-500/10 text-red-300"
                      : "bg-slate-800 text-slate-400"
            }`}
          >
            {statusLabels[loan.status] ?? loan.status}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900/60">
            <p className="text-sm text-slate-400">Kreditbetrag</p>
            <p className="mt-2 text-2xl font-display text-slate-100">
              {formatEuroFromCents(loan.amount)}
            </p>
          </Card>
          <Card className="border-slate-800 bg-slate-900/60">
            <p className="text-sm text-slate-400">Monatsrate</p>
            <p className="mt-2 text-2xl font-display text-slate-100">
              {formatEuroFromCents(loan.monthlyPayment)}
            </p>
          </Card>
          <Card className="border-slate-800 bg-slate-900/60">
            <p className="text-sm text-slate-400">Restbuchstand</p>
            <p className="mt-2 text-2xl font-display text-slate-100">
              {formatEuroFromCents(loan.remainingAmount)}
            </p>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">Zinssatz</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">
              {loan.interestRate.toFixed(2)}% p.a.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">Laufzeit</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">
              {loan.termMonths} Monate
            </p>
            <p className="text-xs text-slate-400">
              {paidCount} bezahlt
              {skippedCount > 0 ? ` · ${skippedCount} ausgesetzt` : ""}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">Bereits gezahlt</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">
              {formatEuroFromCents(paidPrincipal + paidInterest)}
            </p>
            <p className="text-xs text-slate-400">
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            Kredit vollstaendig abbezahlt am{" "}
            {formatGermanDate(loan.paidOffAt)}.
          </div>
        ) : loan.status === "PENDING" ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-slate-300">
            Kreditantrag wird vom Admin bearbeitet.
          </div>
        ) : null}

        {loan.status === "REJECTED" ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-slate-300">
            Kreditantrag wurde abgelehnt.
          </div>
        ) : null}
      </Card>

      {loan.payments.length > 0 ? (
        <Card>
          <h3 className="mb-4 text-2xl font-display font-bold">
            Tilgungsplan
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
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
                    className={`border-b border-slate-800/50 ${
                      payment.status === "PAID" ? "text-slate-400" : "text-slate-100"
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
                    <td className="py-2 pr-4 text-amber-400">
                      {formatEuroFromCents(payment.interestPortion)}
                    </td>
                    <td className="py-2 pr-4">
                      {formatEuroFromCents(payment.remainingBalance)}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          payment.status === "PAID"
                            ? "bg-primary/10 text-primary"
                            : payment.status === "SKIPPED"
                              ? "bg-slate-800 text-slate-400"
                              : payment.status === "LATE"
                                ? "bg-red-500/10 text-red-300"
                                : "bg-slate-800 text-amber-300"
                        }`}
                      >
                        {payment.status === "PAID"
                          ? "Bezahlt"
                          : payment.status === "SKIPPED"
                            ? "Ausgesetzt"
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
