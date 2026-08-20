import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildWalletPassForUser } from "@/lib/wallet/service";

const PKPASS_MIME = "application/vnd.apple.pkpass";

export async function GET(
  request: Request,
  context: { params: Promise<{ passTypeIdentifier: string; serialNumber: string }> },
) {
  const { passTypeIdentifier, serialNumber } = await context.params;
  const authHeader = request.headers.get("authorization") ?? "";
  const suppliedToken = authHeader.replace(/^ApplePass\s+/i, "");

  if (!suppliedToken) {
    return new NextResponse(null, { status: 401 });
  }

  const pass = await prisma.walletPass.findUnique({
    where: { serialNumber },
    select: {
      userId: true,
      passTypeIdentifier: true,
      status: true,
      authenticationTokenHash: true,
    },
  });

  if (
    !pass ||
    pass.passTypeIdentifier !== passTypeIdentifier ||
    pass.status === "REVOKED"
  ) {
    return new NextResponse(null, { status: 404 });
  }

  if (
    createHash("sha256").update(suppliedToken).digest("hex") !==
    pass.authenticationTokenHash
  ) {
    return new NextResponse(null, { status: 401 });
  }

  const { buffer, unsigned } = await buildWalletPassForUser(pass.userId);
  const response = new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": PKPASS_MIME,
      "Content-Disposition": 'attachment; filename="family-card.pkpass"',
      "Cache-Control": "no-store",
      "Last-Modified": new Date().toUTCString(),
    },
  });
  if (unsigned) {
    response.headers.set("X-Pass-Unsigned", "1");
  }
  return response;
}
