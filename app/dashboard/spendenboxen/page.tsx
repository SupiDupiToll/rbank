import { redirect } from "next/navigation";
import { DonationBoxesDashboard } from "@/components/donation-boxes-dashboard";
import { getDonationBoxUrl } from "@/lib/donation-boxes";
import { settleCustomerAccounting } from "@/lib/customer-accounting";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { CACHE_TTL, pageCacheKeys, remember } from "@/lib/cache";

export default async function DonationBoxesPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  if (!user.showDonationBoxesList) {
    redirect("/dashboard/settings");
  }

  const donationBoxes = await remember(
    pageCacheKeys.donationBoxes(user.id),
    CACHE_TTL.lists,
    async () => {
      await settleCustomerAccounting(user.id);

      return prisma.donationBox.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              customerId: true,
              displayName: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      });
    },
  );

  const serializedBoxes = donationBoxes.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    link: getDonationBoxUrl(item.slug),
    createdAt: item.createdAt.toISOString(),
    ownerName: item.user.displayName ?? `Kunde ${item.user.customerId}`,
    ownerCustomerId: item.user.customerId,
  }));

  return (
    <DonationBoxesDashboard
      initialAllBoxes={serializedBoxes}
      initialOwnBoxes={serializedBoxes.filter((item) => item.ownerCustomerId === user.customerId)}
    />
  );
}
