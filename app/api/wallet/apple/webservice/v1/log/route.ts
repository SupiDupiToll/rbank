import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body?.logs) ? body.logs : [];
    for (const message of messages) {
      console.error("[Apple Wallet Webservice]", message);
    }
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 200 });
  }
}
