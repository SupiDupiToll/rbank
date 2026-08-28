-- AlterEnum
ALTER TYPE "TransactionSource" ADD VALUE IF NOT EXISTS 'PAYOUT';

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "merchant_db_id" TEXT NOT NULL,
    "payer_user_id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "description" TEXT NOT NULL,
    "metadata_json" JSONB,
    "idempotency_key" TEXT,
    "payout_date" TIMESTAMP(3) NOT NULL,
    "outgoing_transaction_id" TEXT NOT NULL,
    "incoming_transaction_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_merchant_db_id_idempotency_key_key" ON "Payout"("merchant_db_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "Payout_merchant_db_id_created_at_idx" ON "Payout"("merchant_db_id", "created_at");

-- CreateIndex
CREATE INDEX "Payout_recipient_user_id_created_at_idx" ON "Payout"("recipient_user_id", "created_at");

-- CreateIndex
CREATE INDEX "Payout_payer_user_id_created_at_idx" ON "Payout"("payer_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_merchant_db_id_fkey" FOREIGN KEY ("merchant_db_id") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_payer_user_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
