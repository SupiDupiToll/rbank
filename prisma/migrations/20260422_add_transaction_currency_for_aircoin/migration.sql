CREATE TYPE "TransactionCurrency" AS ENUM ('EUR', 'AIR');

ALTER TABLE "Transaction"
ADD COLUMN "currency" "TransactionCurrency" NOT NULL DEFAULT 'EUR';
