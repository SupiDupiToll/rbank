import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireCustomer,
  safeRoute,
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { amountCentsSchema, safeTextSchema } from "@/lib/security";
import { calculateAnnuity, generateAmortizationSchedule } from "@/lib/loan";

export async function POST(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireCustomer();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.customerApi, user.id);
    if (rateLimitError) return rateLimitError;

    const body = await parseJsonBody(
      request,
      z.object({
        productId: z.string().min(1),
        amount: amountCentsSchema,
        termMonths: z.number().int().min(1).max(120),
        purpose: safeTextSchema(200).optional(),
      }),
    );

    const product = await prisma.loanProduct.findUnique({
      where: { id: body.productId },
    });

    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Kreditprodukt nicht gefunden." }, { status: 404 });
    }

    if (body.amount < product.minAmount || body.amount > product.maxAmount) {
      return NextResponse.json(
        { error: `Betrag muss zwischen ${(product.minAmount / 100).toFixed(2)}€ und ${(product.maxAmount / 100).toFixed(2)}€ liegen.` },
        { status: 400 },
      );
    }

    if (body.termMonths < product.minTermMonths || body.termMonths > product.maxTermMonths) {
      return NextResponse.json(
        { error: `Laufzeit muss zwischen ${product.minTermMonths} und ${product.maxTermMonths} Monaten liegen.` },
        { status: 400 },
      );
    }

    const { monthlyPayment, schedule } = generateAmortizationSchedule(
      body.amount,
      product.interestRate,
      body.termMonths,
    );

    const totalRepayment = schedule.reduce((sum, p) => sum + p.amount, 0);
    const totalInterest = totalRepayment - body.amount;

    const loan = await prisma.loan.create({
      data: {
        userId: user.id,
        loanProductId: product.id,
        amount: body.amount,
        interestRate: product.interestRate,
        termMonths: body.termMonths,
        monthlyPayment,
        totalInterest,
        totalRepayment,
        remainingAmount: body.amount,
        status: "PENDING",
        purpose: body.purpose ?? null,
      },
    });

    return NextResponse.json({ loan }, { status: 201 });
  });
}
