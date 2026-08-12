-- Rendered HTML body for email notifications, captured at dispatch time so retries resend
-- the exact same content. Nullable: whatsapp rows (and any pre-existing email rows) have none.
ALTER TABLE "notifications" ADD COLUMN "html_body" TEXT;
