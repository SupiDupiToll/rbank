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
  getDonationBoxUrl,
  sanitizeDonationBoxName,
} from "@/lib/donation-boxes";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { MAX_NAME_LENGTH } from "@/lib/security";

export async function POST(request: Request) {
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

    const body = await parseJsonBody(
      request,
      z.object({
        name: z.string().min(1).max(MAX_NAME_LENGTH),
      }),
    );

    const name = sanitizeDonationBoxName(body.name);
    const slug = await generateUniqueDonationBoxSlug(name);

    const donationBox = await prisma.donationBox.create({
      data: {
        userId: user.id,
        name,
        slug,
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

    return NextResponse.json(
      {
        donationBox: {
          id: donationBox.id,
          name: donationBox.name,
          slug: donationBox.slug,
          link: getDonationBoxUrl(donationBox.slug),
          createdAt: donationBox.createdAt.toISOString(),
          ownerName:
            donationBox.user.displayName ?? `Kunde ${donationBox.user.customerId}`,
          ownerCustomerId: donationBox.user.customerId,
        },
      },
      { status: 201 },
    );
  });
}
