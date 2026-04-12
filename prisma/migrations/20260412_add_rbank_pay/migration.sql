DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'pin_hash'
  ) THEN
    ALTER TABLE "User" RENAME COLUMN "pin_hash" TO "payment_pin_hash";
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "payment_pin_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "pin_locked_until" TIMESTAMP(3);

ALTER TYPE "TransactionSource" ADD VALUE IF NOT EXISTS 'CHECKOUT';
ALTER TYPE "TransactionSource" ADD VALUE IF NOT EXISTS 'REFUND';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentSessionStatus') THEN
    CREATE TYPE "PaymentSessionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUNDED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Merchant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "merchant_id" TEXT NOT NULL,
  "merchant_secret_hash" TEXT NOT NULL,
  "merchant_secret_enc" TEXT NOT NULL,
  "allowed_redirect_urls" TEXT[],
  "webhook_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Merchant_merchant_id_key" ON "Merchant"("merchant_id");
CREATE INDEX IF NOT EXISTS "Merchant_is_active_created_at_idx" ON "Merchant"("is_active", "created_at");

CREATE TABLE IF NOT EXISTS "PaymentSession" (
  "id" TEXT NOT NULL,
  "merchant_db_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "description" TEXT NOT NULL,
  "redirect_url" TEXT NOT NULL,
  "cancel_url" TEXT NOT NULL,
  "metadata_json" JSONB,
  "status" "PaymentSessionStatus" NOT NULL DEFAULT 'PENDING',
  "token" TEXT NOT NULL,
  "userId" TEXT,
  "paid_at" TIMESTAMP(3),
  "completed_transaction_id" TEXT,
  "refund_transaction_id" TEXT,
  "refunded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentSession_token_key" ON "PaymentSession"("token");
CREATE INDEX IF NOT EXISTS "PaymentSession_merchant_db_id_created_at_idx" ON "PaymentSession"("merchant_db_id", "created_at");
CREATE INDEX IF NOT EXISTS "PaymentSession_status_expires_at_idx" ON "PaymentSession"("status", "expires_at");
CREATE INDEX IF NOT EXISTS "PaymentSession_userId_created_at_idx" ON "PaymentSession"("userId", "created_at");

CREATE TABLE IF NOT EXISTS "PinAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PinAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PinAttempt_userId_created_at_idx" ON "PinAttempt"("userId", "created_at");
CREATE INDEX IF NOT EXISTS "PinAttempt_ip_created_at_idx" ON "PinAttempt"("ip", "created_at");

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "payment_session_id" TEXT;

CREATE INDEX IF NOT EXISTS "Transaction_payment_session_id_idx" ON "Transaction"("payment_session_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PaymentSession_merchant_db_id_fkey'
  ) THEN
    ALTER TABLE "PaymentSession"
      ADD CONSTRAINT "PaymentSession_merchant_db_id_fkey"
      FOREIGN KEY ("merchant_db_id") REFERENCES "Merchant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PaymentSession_userId_fkey'
  ) THEN
    ALTER TABLE "PaymentSession"
      ADD CONSTRAINT "PaymentSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PinAttempt_userId_fkey'
  ) THEN
    ALTER TABLE "PinAttempt"
      ADD CONSTRAINT "PinAttempt_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Transaction_payment_session_id_fkey'
  ) THEN
    ALTER TABLE "Transaction"
      ADD CONSTRAINT "Transaction_payment_session_id_fkey"
      FOREIGN KEY ("payment_session_id") REFERENCES "PaymentSession"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
