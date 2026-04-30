import { z } from "zod";
import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import {
  generateUniqueDonationBoxSlug,
  sanitizeDonationBoxName,
} from "@/lib/donation-boxes";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { cuidSchema, MAX_NAME_LENGTH } from "@/lib/security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.customerApi,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    const { id } = await context.params;
    const parsedId = cuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "Spendenbox nicht gefunden." },
        { status: 404 },
      );
    }

    const donationBox = await prisma.donationBox.findFirst({
      where: {
        id: parsedId.data,
        userId: user.id,
        isActive: true,
      },
      select: { id: true },
    });

    if (!donationBox) {
      return NextResponse.json(
        { error: "Spendenbox nicht gefunden." },
        { status: 404 },
      );
    }

    await prisma.donationBox.update({
      where: { id: donationBox.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, id: donationBox.id });
  });
}

export async function PATCH(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(
      request,
      rateLimitPolicies.customerApi,
      user.id,
    );
    if (rateLimitError) return rateLimitError;

    const { id } = await context.params;
    const parsedId = cuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "Spendenbox nicht gefunden." },
        { status: 404 },
      );
    }

    const body = await parseJsonBody(
      request,
      z.object({
        name: z.string().min(1).max(MAX_NAME_LENGTH),
      }),
    );

    const existingBox = await prisma.donationBox.findFirst({
      where: {
        id: parsedId.data,
        userId: user.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!existingBox) {
      return NextResponse.json(
        { error: "Spendenbox nicht gefunden." },
        { status: 404 },
      );
    }

    const name = sanitizeDonationBoxName(body.name);
    const slug =
      name === existingBox.name
        ? undefined
        : await generateUniqueDonationBoxSlug(name);

    const updatedBox = await prisma.donationBox.update({
      where: { id: existingBox.id },
      data: {
        name,
        ...(slug ? { slug } : {}),
      },
      include: {
        user: {
          select: {
            customerId: true,
            displayName: true,
          },
        },
      },
    });

    return NextResponse.json({
      donationBox: {
        id: updatedBox.id,
        name: updatedBox.name,
        slug: updatedBox.slug,
        link: `${new URL(`/spendenbox/${updatedBox.slug}`, request.url).origin}/spendenbox/${updatedBox.slug}`,
        createdAt: updatedBox.createdAt.toISOString(),
        ownerName:
          updatedBox.user.displayName ?? `Kunde ${updatedBox.user.customerId}`,
        ownerCustomerId: updatedBox.user.customerId,
      },
    });
  });
}
