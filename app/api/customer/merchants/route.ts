import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, requireCustomer, safeRoute } from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";

export type CustomerMerchantSession = {
  token: string;
  amount: number;
  currency: string;
  description: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  customerId: string | null;
  customerName: string | null;
  paidAt: string | null;
  createdAt: string;
  refundedAt: string | null;
};

export type CustomerMerchant = {
  id: string;
  name: string;
  merchantId: string;
  isActive: boolean;
  createdAt: string;
  sessionCount: number;
  totalVolumeCents: number;
  volumeTodayCents: number;
  volumeMonthCents: number;
  sessions: CustomerMerchantSession[];
};

export async function GET(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const merchants = await prisma.merchant.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }],
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

    return NextResponse.json({
      merchants: merchants.map((merchant) => {
        const completedSessions = merchant.paymentSessions.filter(
          (session) =>
            session.status === "COMPLETED" || session.status === "REFUNDED",
        );

        return {
          id: merchant.id,
          name: merchant.name,
          merchantId: merchant.merchantId,
          isActive: merchant.isActive,
          createdAt: merchant.createdAt.toISOString(),
          sessionCount: merchant.paymentSessions.length,
          totalVolumeCents: completedSessions.reduce(
            (sum, session) => sum + session.amount,
            0,
          ),
          volumeTodayCents: completedSessions
            .filter((session) => (session.paidAt ?? session.createdAt) >= startOfToday)
            .reduce((sum, session) => sum + session.amount, 0),
          volumeMonthCents: completedSessions
            .filter((session) => (session.paidAt ?? session.createdAt) >= startOfMonth)
            .reduce((sum, session) => sum + session.amount, 0),
          sessions: merchant.paymentSessions.map((session) => ({
            token: session.token,
            amount: session.amount,
            currency: session.currency,
            description: session.description,
            status: session.status,
            customerId: session.user?.customerId ?? null,
            customerName: session.user?.displayName ?? null,
            paidAt: session.paidAt?.toISOString() ?? null,
            createdAt: session.createdAt.toISOString(),
            refundedAt: session.refundedAt?.toISOString() ?? null,
          })),
        } satisfies CustomerMerchant;
      }),
    });
  });
}
