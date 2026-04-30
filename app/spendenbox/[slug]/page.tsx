import { notFound } from "next/navigation";
import { PublicDonationBox } from "@/components/public-donation-box";
import { getCurrentAppUser } from "@/lib/current-user";
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
  const currentUser = await getCurrentAppUser();
  const [{ slug }, { status }] = await Promise.all([params, searchParams]);
  const parsedSlug = donationBoxSlugSchema.safeParse(slug);

  if (!parsedSlug.success) {
    notFound();
  }

  const donationBox = await prisma.donationBox.findUnique({
    where: { slug: parsedSlug.data },
  });

  if (!donationBox || !donationBox.isActive) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background-dark text-slate-100">
      <PublicDonationBox
        isAuthenticated={Boolean(currentUser)}
        name={donationBox.name}
        slug={donationBox.slug}
        success={status === "success"}
      />
    </main>
  );
}
