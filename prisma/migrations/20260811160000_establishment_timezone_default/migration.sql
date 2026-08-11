-- Business hours and employee schedules are bare "HH:mm" wall-clock strings. They used to be
-- resolved against UTC, which published every slot shifted by the establishment's real offset
-- (09:00 opening surfaced as 06:00 for a Brazilian salon). The availability engine now resolves
-- them against the establishment's own zone, so the stored zone has to be the real one.
ALTER TABLE "establishments" ALTER COLUMN "timezone" SET DEFAULT 'America/Sao_Paulo';

-- Every existing row was created under the old UTC-only default and never had a zone chosen
-- deliberately, so they all move to the product's actual market.
UPDATE "establishments" SET "timezone" = 'America/Sao_Paulo' WHERE "timezone" = 'UTC';
