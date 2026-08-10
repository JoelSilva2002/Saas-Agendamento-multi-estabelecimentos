-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('whatsapp', 'email');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('confirmation', 'reminder_24h', 'reminder_2h', 'cancellation');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed');

-- AlterTable
ALTER TABLE "establishments" ADD COLUMN     "deposit_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deposit_percentage" INTEGER;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "establishment_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT NOT NULL,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_establishment_id_appointment_id_idx" ON "notifications"("establishment_id", "appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_appointment_id_type_channel_key" ON "notifications"("appointment_id", "type", "channel");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint: keep depositPercentage in the valid 1-100 range whenever it's set,
-- mirroring the same invariant already enforced for no_show_fee_percentage (Fase 4) and
-- in the Establishment domain entity.
ALTER TABLE "establishments" ADD CONSTRAINT "establishments_deposit_percentage_range"
  CHECK ("deposit_percentage" IS NULL OR ("deposit_percentage" > 0 AND "deposit_percentage" <= 100));
