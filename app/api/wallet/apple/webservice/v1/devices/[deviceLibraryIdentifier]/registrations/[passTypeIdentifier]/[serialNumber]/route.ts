import { NextResponse } from "next/server";
import { registerDeviceForPass, unregisterDeviceFromPass } from "@/lib/wallet/service";

function parseAuthentication(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.replace(/^ApplePass\s+/i, "");
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      deviceLibraryIdentifier: string;
      passTypeIdentifier: string;
      serialNumber: string;
    }>;
  },
) {
  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } =
    await context.params;

  const authenticationToken = parseAuthentication(request);
  if (!authenticationToken) {
    return new NextResponse(null, { status: 401 });
  }

  let pushToken = "";
  try {
    const body = (await request.json()) as { pushToken?: string };
    pushToken = typeof body.pushToken === "string" ? body.pushToken.trim() : "";
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (!pushToken) {
    return new NextResponse(null, { status: 400 });
  }

  const created = await registerDeviceForPass({
    serialNumber,
    passTypeIdentifier,
    deviceLibraryIdentifier,
    pushToken,
    authenticationToken,
  });

  if (created === null) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { status: created ? 201 : 200 });
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      deviceLibraryIdentifier: string;
      passTypeIdentifier: string;
      serialNumber: string;
    }>;
  },
) {
  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } =
    await context.params;

  const authenticationToken = parseAuthentication(request);
  if (!authenticationToken) {
    return new NextResponse(null, { status: 401 });
  }

  const removed = await unregisterDeviceFromPass({
    serialNumber,
    passTypeIdentifier,
    deviceLibraryIdentifier,
    authenticationToken,
  });

  if (!removed) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { status: 200 });
}
