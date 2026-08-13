-- Fase 24: idempotency key for the integration API's POST /appointments.
ALTER TABLE "appointments" ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "appointments_establishment_id_idempotency_key_key" ON "appointments"("establishment_id", "idempotency_key");
