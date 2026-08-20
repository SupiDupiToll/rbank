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
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        href={"/dashboard/festgeld" as Route}
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Zurück zu Festgeld
      </Link>

      <Card className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-label-sm text-label-sm text-primary">
              Festgeld-Detail
            </p>
            <h2 className="font-headline-md text-headline-md mt-2 text-on-surface">
              {account.label}
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${
              account.status === "UNLOCKED"
                ? "bg-primary-container/20 text-primary"
                : account.status === "PAID_OUT"
                  ? "bg-surface-container-highest text-on-surface-variant"
                  : "bg-tertiary-container/30 text-tertiary"
            }`}
          >
            {account.status === "UNLOCKED" ? "Unlocked" : account.status === "PAID_OUT" ? "Ausgezahlt" : "Aktiv"}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Anlagebetrag</p>
            <p className="font-balance-display text-balance-display mt-2 text-on-surface">{formatEuroFromCents(account.amount)}</p>
          </Card>
          <Card>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Zinsgutschrift</p>
            <p className="font-balance-display text-balance-display mt-2 text-tertiary">{formatEuroFromCents(interestAmount)}</p>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass-card rounded-2xl p-5">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Laufzeit</p>
            <p className="mt-2 text-lg font-semibold text-on-surface">
              {formatGermanDate(account.startDate)} bis {formatGermanDate(account.endDate)}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">Zinssatz {account.interestRate.toFixed(2)}%</p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <FestgeldCountdown endDate={account.endDate.toISOString()} />
          </div>
        </div>

        {account.status === "UNLOCKED" ? (
          <div className="glass-card rounded-2xl border-tertiary/30 p-5">
            <p className="text-sm text-on-surface">
              Dieses Festgeld ist abgelaufen und entsperrt. Die Zinsen wurden bereits automatisch gutgeschrieben. Du kannst
              jetzt entweder das Festgeld verlängern oder den kompletten Anlagebetrag ins Guthaben auszahlen lassen.
            </p>
            <div className="mt-4">
              <FestgeldMaturityActions accountId={account.id} />
            </div>
          </div>
        ) : null}

        {account.status === "PAID_OUT" ? (
          <div className="glass-card rounded-2xl p-5 text-sm text-on-surface-variant">
            Dieses Festgeld wurde bereits ausgezahlt.
          </div>
        ) : null}
      </Card>
    </div>
  );
}