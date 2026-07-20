/*
  Warnings:

  - You are about to drop the column `merchant_secret_enc` on the `Merchant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN "merchant_secret_enc",
ADD COLUMN     "webhook_secret_enc" TEXT,
ADD COLUMN     "webhook_secret_hash" TEXT;
