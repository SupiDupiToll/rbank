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
    <div className="space-y-8 pb-8">
      {/* Balance Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/30 via-primary/15 to-transparent px-6 pb-8 pt-8 sm:px-8 sm:pt-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl sm:h-56 sm:w-56" />
        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
          Verfügbarer Betrag
        </p>
        <p className="relative mt-3 text-5xl font-display tracking-tight text-slate-100 sm:text-6xl">
          {formatEuroFromCents(balanceCents)}
        </p>
      </div>

      {/* Transfer Form */}
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          Überweisung senden
        </p>
        <CustomerTransferForm balanceCents={balanceCents} />
      </div>
    </div>
  );
}
