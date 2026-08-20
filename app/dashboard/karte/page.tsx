import { CardTab } from "@/components/card-tab";
import { cardIframeUrl } from "@/lib/env";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { CACHE_TTL, pageCacheKeys, remember } from "@/lib/cache";

export default async function KartePage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  const [card, account] = await remember(
    pageCacheKeys.card(user.id),
    CACHE_TTL.page,
    () =>
      Promise.all([
        prisma.card.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            status: true,
            email: true,
            phoneNumber: true,
            cardLastFour: true,
            balanceCents: true,
            activatedAt: true,
          },
        }),
        prisma.user.findUnique({
          where: { id: user.id },
          select: { balanceCents: true },
        }),
      ]),
  );

  return (
    <CardTab
      initialCard={
        card
          ? {
              status: card.status,
              cardLastFour: card.cardLastFour,
              phoneNumber: card.phoneNumber,
              balanceCents: card.balanceCents,
              activatedAt: card.activatedAt?.toISOString() ?? null,
            }
          : null
      }
      balanceCents={account?.balanceCents ?? 0}
      iframeUrl={cardIframeUrl}
    />
  );
}