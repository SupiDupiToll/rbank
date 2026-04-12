import { NextResponse } from "next/server";
import { parseInput, requireAdmin, safeRoute } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { enforceRateLimit } from "@/lib/api-helpers";
import { merchantIdSchema } from "@/lib/security";

type Params = {
  params: Promise<{ merchantId: string }>;
};

export async function GET(request: Request, context: Params) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    const { merchantId } = await context.params;
    const parsedMerchantId = parseInput(merchantIdSchema, merchantId);

    const merchant = await prisma.merchant.findUnique({
      where: { merchantId: parsedMerchantId },
      include: {
        paymentSessions: {
          orderBy: [{ createdAt: "desc" }],
          include: {
            user: {
              select: {
                customerId: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Haendler nicht gefunden." }, { status: 404 });
    }

    const rows = [
      [
        "token",
        "status",
        "amount",
        "currency",
        "description",
        "customerId",
        "customerName",
        "createdAt",
        "paidAt",
        "refundedAt",
      ].join(","),
      ...merchant.paymentSessions.map((session) =>
        [
          session.token,
          session.status,
          session.amount,
          session.currency,
          `"${session.description.replace(/"/g, '""')}"`,
          session.user?.customerId ?? "",
          `"${(session.user?.displayName ?? "").replace(/"/g, '""')}"`,
          session.createdAt.toISOString(),
          session.paidAt?.toISOString() ?? "",
          session.refundedAt?.toISOString() ?? "",
        ].join(","),
      ),
    ];

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="merchant-${merchant.merchantId}-report.csv"`,
      },
    });
  });
}
