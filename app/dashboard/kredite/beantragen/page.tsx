import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { LoanApplicationForm } from "@/components/loan-application-form";
import { CACHE_TTL, pageCacheKeys, remember } from "@/lib/cache";

export default async function BeantragenPage() {
  const user = await getCurrentAppUser();
  if (!user) return null;

  const products = await remember(
    pageCacheKeys.loanProducts(),
    CACHE_TTL.lists,
    () =>
      prisma.loanProduct.findMany({
        where: { isActive: true },
        orderBy: { interestRate: "asc" },
      }),
  );

  return (
    <div className="space-y-8 pb-8">
      <div>
        <p className="font-label-sm text-label-sm text-primary">
          Kredit beantragen
        </p>
        <h2 className="font-headline-md text-headline-md mt-2 text-on-surface">
          Neuen Kredit
        </h2>
      </div>

      <LoanApplicationForm products={products} />
    </div>
  );
}