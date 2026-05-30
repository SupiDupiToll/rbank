import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { FestgeldCountdown } from "@/components/festgeld-countdown";
import { FestgeldMaturityActions } from "@/components/festgeld-maturity-actions";
import { formatGermanDate } from "@/lib/date";
import { formatEuroFromCents } from "@/lib/money";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { calculateFestgeldInterestCents } from "@/lib/festgeld";
import { settleCustomerAccounting } from "@/lib/customer-accounting";

type FestgeldDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FestgeldDetailPage({ params }: FestgeldDetailPageProps) {
  const user = await getCurrentAppUser();
  if (!user) return null;

  const { id } = await params;

  await settleCustomerAccounting(user.id);

  const account = await prisma.festgeldAccount.findFirst({
    where: { id, userId: user.id }
  });

  if (!account) {
    notFound();
  }

  const interestAmount = calculateFestgeldInterestCents(account.amount, account.interestRate, account.startDate, account.endDate);

  return (
    <div className="space-y-6">
      <Link className="inline-flex text-sm font-semibold text-primary" href={"/dashboard/festgeld" as Route}>
        Zurück zu Festgeld
      </Link>

      <Card className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Festgeld-Detail</p>
            <h2 className="mt-2 text-3xl font-display text-slate-100">{account.label}</h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${
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

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/60">
            <p className="text-sm text-slate-400">Anlagebetrag</p>
            <p className="mt-2 text-2xl font-display text-slate-100">{formatEuroFromCents(account.amount)}</p>
          </Card>
          <Card className="border-slate-800 bg-slate-900/60">
            <p className="text-sm text-slate-400">Zinsgutschrift</p>
            <p className="mt-2 text-2xl font-display text-slate-100">{formatEuroFromCents(interestAmount)}</p>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">Laufzeit</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">
              {formatGermanDate(account.startDate)} bis {formatGermanDate(account.endDate)}
            </p>
            <p className="mt-2 text-sm text-slate-400">Zinssatz {account.interestRate.toFixed(2)}%</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <FestgeldCountdown endDate={account.endDate.toISOString()} />
          </div>
        </div>

        {account.status === "UNLOCKED" ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-slate-200">
              Dieses Festgeld ist abgelaufen und entsperrt. Die Zinsen wurden bereits automatisch gutgeschrieben. Du kannst
              jetzt entweder das Festgeld verlängern oder den kompletten Anlagebetrag ins Guthaben auszahlen lassen.
            </p>
            <div className="mt-4">
              <FestgeldMaturityActions accountId={account.id} />
            </div>
          </div>
        ) : null}

        {account.status === "PAID_OUT" ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            Dieses Festgeld wurde bereits ausgezahlt.
          </div>
        ) : null}
      </Card>
    </div>
  );
}
