import { NextRequest, NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getCurrentAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { subscription, userId: _userId } = body as {
    subscription: PushSubscriptionJSON;
    userId: string;
  };

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return NextResponse.json(
      { error: "Invalid subscription" },
      { status: 400 },
    );
  }

  try {
    // Check if subscription already exists (avoid duplicates)
    const existing = await prisma.pushSubscription.findFirst({
      where: {
        userId: user.id,
        endpoint: subscription.endpoint,
      },
    });

    if (existing) {
      console.log(`ℹ️ Push subscription already exists for user ${user.id}`);
      return NextResponse.json({ success: true, alreadyExists: true });
    }

    await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh!,
        auth: subscription.keys.auth!,
      },
    });

    console.log(`✅ Push subscription saved for user ${user.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 },
    );
  }
}
