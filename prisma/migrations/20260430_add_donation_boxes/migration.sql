ALTER TABLE "User"
ADD COLUMN "show_donation_boxes_list" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DonationBox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DonationBox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DonationBox_slug_key" ON "DonationBox"("slug");
CREATE INDEX "DonationBox_userId_created_at_idx" ON "DonationBox"("userId", "created_at");
CREATE INDEX "DonationBox_created_at_idx" ON "DonationBox"("created_at");

ALTER TABLE "PaymentSession"
ADD COLUMN "recipient_user_id" TEXT,
ADD COLUMN "donation_box_id" TEXT;

CREATE INDEX "PaymentSession_recipient_user_id_created_at_idx" ON "PaymentSession"("recipient_user_id", "created_at");
CREATE INDEX "PaymentSession_donation_box_id_created_at_idx" ON "PaymentSession"("donation_box_id", "created_at");

ALTER TABLE "DonationBox"
ADD CONSTRAINT "DonationBox_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentSession"
ADD CONSTRAINT "PaymentSession_recipient_user_id_fkey"
FOREIGN KEY ("recipient_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentSession"
ADD CONSTRAINT "PaymentSession_donation_box_id_fkey"
FOREIGN KEY ("donation_box_id") REFERENCES "DonationBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "TransactionSource" ADD VALUE IF NOT EXISTS 'DONATION';
