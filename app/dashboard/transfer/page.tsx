import { CustomerTransferForm } from "@/components/customer-transfer-form";
import { getBalancesByCurrency } from "@/lib/banking";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { getCurrentAppUser } from "@/lib/current-user";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function TransferPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  await settleCustomerAccounting(user.id);

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    select: { type: true, amount: true, currency: true },
  });
  const { eurBalanceCents, airBalance } = getBalancesByCurrency(transactions);

  return (
    <div className="space-y-8 pb-8">
      {/* Balance Header */}
      <div className="glass-card mesh-gradient relative overflow-hidden rounded-xl p-6">
        <p className="font-label-sm text-label-sm mb-5 text-on-surface-variant">
          Verfügbare Konten
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Girokonto
            </p>
            <p className="font-balance-display text-balance-display mt-2 tracking-tight text-on-surface">
              {formatEuroFromCents(eurBalanceCents)}
            </p>
          </div>
          <div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              AirCoin Konto
            </p>
            <p className="font-balance-display text-balance-display mt-2 tracking-tight text-secondary">
              {formatAirFromUnits(airBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Form */}
      <div>
        <p className="font-label-sm text-label-sm mb-4 text-on-surface-variant">
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