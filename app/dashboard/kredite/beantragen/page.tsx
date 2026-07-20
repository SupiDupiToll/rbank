import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { LoanApplicationForm } from "@/components/loan-application-form";

export default async function BeantragenPage() {
  const user = await getCurrentAppUser();
  if (!user) return null;

  const products = await prisma.loanProduct.findMany({
    where: { isActive: true },
    orderBy: { interestRate: "asc" },
  });

  return (
    <div className="space-y-8 pb-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Kredit beantragen
        </p>
        <h2 className="mt-2 text-3xl font-display text-slate-100">
          Neuen Kredit
        </h2>
      </div>

      <LoanApplicationForm products={products} />
    </div>
  );
}
