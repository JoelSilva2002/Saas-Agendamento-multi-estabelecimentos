-- "Aviso de reagendamento" (§8.1 da documentação).
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'reschedule';

-- An appointment can be rescheduled more than once, so its notice is not a one-shot event.
-- The existing idempotency key (appointment, type, channel) would silently swallow every
-- reschedule notice after the first, so it gains a per-occurrence token: '' for the one-shot
-- types, and the new start time for `reschedule`.
--
-- NOT NULL with a '' default on purpose: Postgres treats NULLs as distinct inside a unique
-- index, so a nullable column would quietly break the guarantee that the reminders cron
-- never sends the same reminder twice.
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "notifications_appointment_id_type_channel_key";

CREATE UNIQUE INDEX "notifications_appointment_id_type_channel_dedupe_key_key"
  ON "notifications"("appointment_id", "type", "channel", "dedupe_key");
