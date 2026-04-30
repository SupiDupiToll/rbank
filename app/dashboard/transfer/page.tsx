import { CustomerTransferForm } from "@/components/customer-transfer-form";
import { getBalancesByCurrency } from "@/lib/banking";
import { getCurrentAppUser } from "@/lib/current-user";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function TransferPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    select: { type: true, amount: true, currency: true },
  });
  const { eurBalanceCents, airBalance } = getBalancesByCurrency(transactions);

  return (
    <div className="space-y-8 pb-8">
      {/* Balance Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/30 via-primary/15 to-transparent px-6 pb-8 pt-8 sm:px-8 sm:pt-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl sm:h-56 sm:w-56" />
        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
          Verfügbare Konten
        </p>
        <div className="relative mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-400">Girokonto</p>
            <p className="mt-2 text-4xl font-display tracking-tight text-slate-100">
              {formatEuroFromCents(eurBalanceCents)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">AirCoin Konto</p>
            <p className="mt-2 text-4xl font-display tracking-tight text-slate-100">
              {formatAirFromUnits(airBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Form */}
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          Überweisung senden
        </p>
        <CustomerTransferForm
          airBalance={airBalance}
          balanceCents={eurBalanceCents}
        />
      </div>
    </div>
  );
}
