import { notFound } from "next/navigation";
import { PublicDonationBox } from "@/components/public-donation-box";
import { prisma } from "@/lib/prisma";
import { donationBoxSlugSchema } from "@/lib/security";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function DonationBoxPage({
  params,
  searchParams,
}: Props) {
  const [{ slug }, { status }] = await Promise.all([params, searchParams]);
  const parsedSlug = donationBoxSlugSchema.safeParse(slug);

  if (!parsedSlug.success) {
    notFound();
  }

  const donationBox = await prisma.donationBox.findUnique({
    where: { slug: parsedSlug.data },
    include: {
      user: {
        select: {
          customerId: true,
          displayName: true,
        },
      },
    },
  });

  if (!donationBox || !donationBox.isActive) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background-dark text-slate-100">
      <PublicDonationBox
        name={donationBox.name}
        ownerName={
          donationBox.user.displayName ?? `Kunde ${donationBox.user.customerId}`
        }
        slug={donationBox.slug}
        success={status === "success"}
      />
    </main>
  );
}
