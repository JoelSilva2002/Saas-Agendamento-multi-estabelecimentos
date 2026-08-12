-- Notification retry bookkeeping.
ALTER TABLE "notifications" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "notifications" ADD COLUMN "next_attempt_at" TIMESTAMP(3);

CREATE INDEX "notifications_status_next_attempt_at_idx" ON "notifications"("status", "next_attempt_at");

-- Per-establishment reminder/channel toggles. Defaulting all to true preserves current
-- behaviour for every existing establishment.
ALTER TABLE "establishments" ADD COLUMN "reminder_24h_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "establishments" ADD COLUMN "reminder_2h_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "establishments" ADD COLUMN "notify_email_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "establishments" ADD COLUMN "notify_whatsapp_enabled" BOOLEAN NOT NULL DEFAULT true;
