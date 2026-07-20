-- Add new values to TransactionSource enum
ALTER TYPE "TransactionSource" ADD VALUE 'LOAN_DISBURSEMENT';
ALTER TYPE "TransactionSource" ADD VALUE 'LOAN_REPAYMENT';

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SCHEDULED', 'PAID', 'SKIPPED', 'LATE');

-- CreateTable
CREATE TABLE "LoanProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "min_amount" INTEGER NOT NULL,
    "max_amount" INTEGER NOT NULL,
    "min_term_months" INTEGER NOT NULL,
    "max_term_months" INTEGER NOT NULL,
    "interest_rate" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "loan_product_id" TEXT,
    "amount" INTEGER NOT NULL,
    "interest_rate" DOUBLE PRECISION NOT NULL,
    "term_months" INTEGER NOT NULL,
    "monthly_payment" INTEGER NOT NULL,
    "total_interest" INTEGER NOT NULL,
    "total_repayment" INTEGER NOT NULL,
    "remaining_amount" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disbursement_tx_id" TEXT,
    "paid_off_at" TIMESTAMP(3),

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "amount" INTEGER NOT NULL,
    "principal_portion" INTEGER NOT NULL,
    "interest_portion" INTEGER NOT NULL,
    "remaining_balance" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "transaction_id" TEXT,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoanProduct_is_active_idx" ON "LoanProduct"("is_active");

-- CreateIndex
CREATE INDEX "Loan_user_id_status_idx" ON "Loan"("user_id", "status");

-- CreateIndex
CREATE INDEX "Loan_status_created_at_idx" ON "Loan"("status", "created_at");

-- CreateIndex
CREATE INDEX "LoanPayment_loan_id_installment_number_idx" ON "LoanPayment"("loan_id", "installment_number");

-- CreateIndex
CREATE INDEX "LoanPayment_loan_id_status_idx" ON "LoanPayment"("loan_id", "status");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_loan_product_id_fkey" FOREIGN KEY ("loan_product_id") REFERENCES "LoanProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
