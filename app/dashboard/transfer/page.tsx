import { Card } from "@/components/ui/card";
import { CustomerTransferForm } from "@/components/customer-transfer-form";
import { formatEuroFromCents } from "@/lib/money";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function TransferPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  const [incoming, outgoing] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "INCOMING" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "OUTGOING" },
      _sum: { amount: true },
    }),
  ]);

  const balanceCents =
    (incoming._sum.amount ?? 0) - (outgoing._sum.amount ?? 0);

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
        Überweisung
      </p>
      <h2 className="mt-2 text-3xl font-display text-slate-100">Senden</h2>
      <div className="mt-8">
        <CustomerTransferForm balanceCents={balanceCents} />
      </div>
    </Card>
  );
}
