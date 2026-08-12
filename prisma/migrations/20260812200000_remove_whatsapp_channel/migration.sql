-- WhatsApp sending was removed (not viable for now) — email is the only notification channel.
-- The notify_whatsapp_enabled toggle no longer has any code path that reads it.
ALTER TABLE "establishments" DROP COLUMN "notify_whatsapp_enabled";

-- The NotificationChannel enum and Notification.channel column are intentionally left as-is:
-- historical 'whatsapp' rows (if any) stay readable, and re-adding the channel later stays
-- cheap since the schema affordance is already there.
