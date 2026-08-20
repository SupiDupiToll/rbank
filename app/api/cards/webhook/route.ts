import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeRoute } from "@/lib/api-helpers";
import { env } from "@/lib/env";
import { stackServerApp } from "@/stack/server";
import { invalidateUserData } from "@/lib/cache";

const cardWebhookBodySchema = z.object({
  event: z.enum(["card_activated", "card_updated"]),
  email: z.string().email(),
  phoneNumber: z.string().min(3).max(32),
  cardLastFour: z.string().regex(/^\d{4}$/, "cardLastFour muss 4 Ziffern sein."),
});

function verifyWebhookSecret(request: Request) {
  const secret = env.CARD_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const supplied =
    request.headers.get("x-card-webhook-secret") ??
    (authorization?.startsWith("Bearer ") ? authorization.slice(7) : null);

  if (!supplied) {
    return false;
  }

  const a = Buffer.from(supplied);
  const b = Buffer.from(secret);

  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  return safeRoute(async () => {
    if (!verifyWebhookSecret(request)) {
      return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = cardWebhookBodySchema.parse(body);

    const normalizedEmail = parsed.email.trim().toLowerCase();
    const stackUsers = await stackServerApp.listUsers({ query: normalizedEmail });
    const stackUser = stackUsers.find(
      (user) => user.primaryEmail?.trim().toLowerCase() === normalizedEmail,
    );

    if (!stackUser) {
      return NextResponse.json(
        { error: "Kein RBank-Konto mit dieser E-Mail gefunden." },
        { status: 404 },
      );
    }

    const rbankUser = await prisma.user.findUnique({
      where: { stackUserId: stackUser.id },
      select: { id: true },
    });

    if (!rbankUser) {
      return NextResponse.json(
        { error: "Kein RBank-Konto mit dieser E-Mail gefunden." },
        { status: 404 },
      );
    }

    const isActivating = parsed.event === "card_activated";
    const card = await prisma.card.upsert({
      where: { userId: rbankUser.id },
      create: {
        userId: rbankUser.id,
        email: normalizedEmail,
        phoneNumber: parsed.phoneNumber,
        cardLastFour: parsed.cardLastFour,
        status: "ACTIVE",
        activatedAt: new Date(),
      },
      update: {
        email: normalizedEmail,
        phoneNumber: parsed.phoneNumber,
        cardLastFour: parsed.cardLastFour,
        status: "ACTIVE",
        ...(isActivating ? { activatedAt: new Date() } : {}),
      },
      select: {
        id: true,
        status: true,
        cardLastFour: true,
        phoneNumber: true,
        email: true,
        activatedAt: true,
        balanceCents: true,
      },
    });

    invalidateUserData(rbankUser.id);

    return NextResponse.json({ ok: true, card });
  });
}