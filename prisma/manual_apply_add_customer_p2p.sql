ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT;

WITH numbered_users AS (
  SELECT
    id,
    LPAD((10000000 + ROW_NUMBER() OVER (ORDER BY "createdAt", id))::text, 8, '0') AS generated_customer_id
  FROM "User"
  WHERE "customerId" IS NULL
)
UPDATE "User" AS target
SET
  "customerId" = numbered_users.generated_customer_id,
  "displayName" = COALESCE(target."displayName", target."stackUserId")
FROM numbered_users
WHERE target.id = numbered_users.id;

ALTER TABLE "User" ALTER COLUMN "customerId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionSource') THEN
    CREATE TYPE "TransactionSource" AS ENUM ('ADMIN', 'TRANSFER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FestgeldStatus') THEN
    CREATE TYPE "FestgeldStatus" AS ENUM ('ACTIVE', 'UNLOCKED', 'PAID_OUT');
  END IF;
END $$;

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "source" "TransactionSource";
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "transferId" TEXT;

UPDATE "Transaction"
SET "source" = 'ADMIN'
WHERE "source" IS NULL;

ALTER TABLE "Transaction" ALTER COLUMN "source" SET DEFAULT 'ADMIN';
ALTER TABLE "Transaction" ALTER COLUMN "source" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_customerId_key" ON "User"("customerId");
CREATE INDEX IF NOT EXISTS "Transaction_transferId_idx" ON "Transaction"("transferId");

ALTER TABLE "FestgeldAccount" ADD COLUMN IF NOT EXISTS "status" "FestgeldStatus";
ALTER TABLE "FestgeldAccount" ADD COLUMN IF NOT EXISTS "interestCreditedAt" TIMESTAMP(3);
ALTER TABLE "FestgeldAccount" ADD COLUMN IF NOT EXISTS "payoutDate" TIMESTAMP(3);
ALTER TABLE "FestgeldAccount" ADD COLUMN IF NOT EXISTS "payoutTransactionId" TEXT;
ALTER TABLE "FestgeldAccount" ADD COLUMN IF NOT EXISTS "lockedTransactionId" TEXT;

UPDATE "FestgeldAccount"
SET "status" = 'ACTIVE'
WHERE "status" IS NULL;

ALTER TABLE "FestgeldAccount" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "FestgeldAccount" ALTER COLUMN "status" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "FestgeldAccount_status_endDate_idx" ON "FestgeldAccount"("status", "endDate");
