import { NextResponse } from "next/server";
import { authenticateMerchantRequest } from "@/lib/payments";
import { serializePayout } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import { cuidSchema } from "@/lib/security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Params) {
  const { merchant, error } = await authenticateMerchantRequest(request);
  if (error || !merchant) {
    return error;
  }

  const { id } = await context.params;
  const parsedId = cuidSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Ungueltige Auszahlungs-ID." },
      { status: 400 },
    );
  }

  const payout = await prisma.payout.findFirst({
    where: { id: parsedId.data, merchantDbId: merchant.id },
    include: {
      merchant: { select: { name: true } },
      payerUser: { select: { customerId: true, displayName: true } },
      recipientUser: { select: { customerId: true, displayName: true } },
    },
  });

  if (!payout) {
    return NextResponse.json(
      { error: "Auszahlung nicht gefunden." },
      { status: 404 },
    );
  }

  return NextResponse.json(serializePayout(payout));
}
