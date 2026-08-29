import { CustomerTransferForm } from "@/components/customer-transfer-form";
import { getBalancesByCurrency } from "@/lib/banking";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { getCurrentAppUser } from "@/lib/current-user";
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
    <div className="space-y-4 pb-8">
      <CustomerTransferForm
        airBalance={airBalance}
        balanceCents={eurBalanceCents}
      />
    </div>
  );
}
