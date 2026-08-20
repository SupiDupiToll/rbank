import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUpdatedSerialNumbers } from "@/lib/wallet/service";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      deviceLibraryIdentifier: string;
      passTypeIdentifier: string;
    }>;
  },
) {
  const { deviceLibraryIdentifier, passTypeIdentifier } = await context.params;

  const device = await prisma.walletDevice.findUnique({
    where: { deviceLibraryIdentifier },
    select: { id: true },
  });

  if (!device) {
    return new NextResponse(null, { status: 204 });
  }

  const url = new URL(request.url);
  const passesUpdatedSince = url.searchParams.get("passesUpdatedSince") ?? undefined;

  const result = await getUpdatedSerialNumbers({
    passTypeIdentifier,
    deviceLibraryIdentifier,
    passesUpdatedSince,
  });

  if (!result) {
    return new NextResponse(null, { status: 204 });
  }

  if (result.serialNumbers.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(result, { status: 200 });
}
