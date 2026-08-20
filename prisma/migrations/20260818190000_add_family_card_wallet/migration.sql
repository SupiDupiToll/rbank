-- AlterTable
ALTER TABLE "User" ADD COLUMN "is_blocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "WalletPassStatus" AS ENUM ('ACTIVE', 'LOCKED', 'REVOKED');

-- CreateTable
CREATE TABLE "WalletPass" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "passTypeIdentifier" TEXT NOT NULL,
    "authentication_token_hash" TEXT NOT NULL,
    "card_last_four" TEXT NOT NULL,
    "status" "WalletPassStatus" NOT NULL DEFAULT 'ACTIVE',
    "content_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_push_update" TIMESTAMP(3),

    CONSTRAINT "WalletPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletDevice" (
    "id" TEXT NOT NULL,
    "device_library_identifier" TEXT NOT NULL,
    "push_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletRegistration" (
    "id" TEXT NOT NULL,
    "pass_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletPass_userId_key" ON "WalletPass"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletPass_serialNumber_key" ON "WalletPass"("serialNumber");

-- CreateIndex
CREATE INDEX "WalletPass_userId_idx" ON "WalletPass"("userId");

-- CreateIndex
CREATE INDEX "WalletPass_status_updated_at_idx" ON "WalletPass"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "WalletDevice_device_library_identifier_key" ON "WalletDevice"("device_library_identifier");

-- CreateIndex
CREATE INDEX "WalletDevice_device_library_identifier_idx" ON "WalletDevice"("device_library_identifier");

-- CreateIndex
CREATE INDEX "WalletRegistration_device_id_idx" ON "WalletRegistration"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "WalletRegistration_pass_id_device_id_key" ON "WalletRegistration"("pass_id", "device_id");

-- AddForeignKey
ALTER TABLE "WalletPass" ADD CONSTRAINT "WalletPass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletRegistration" ADD CONSTRAINT "WalletRegistration_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "WalletPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletRegistration" ADD CONSTRAINT "WalletRegistration_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "WalletDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
