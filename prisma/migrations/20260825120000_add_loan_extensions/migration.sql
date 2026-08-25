-- CreateTable
CREATE TYPE "LoanExtensionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "LoanExtension" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "requested_term_months" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "LoanExtensionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "old_term_months" INTEGER NOT NULL,
    "old_interest_rate" DOUBLE PRECISION NOT NULL,
    "old_one_time_fee_cents" INTEGER,
    "new_term_months" INTEGER,
    "new_interest_rate" DOUBLE PRECISION,
    "new_one_time_fee_cents" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanExtension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoanExtension_loan_id_status_idx" ON "LoanExtension"("loan_id", "status");

-- CreateIndex
CREATE INDEX "LoanExtension_status_created_at_idx" ON "LoanExtension"("status", "created_at");

-- AddForeignKey
ALTER TABLE "LoanExtension" ADD CONSTRAINT "LoanExtension_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
