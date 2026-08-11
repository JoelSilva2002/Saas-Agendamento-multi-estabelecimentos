-- The establishment slug is now the public booking URL (/<slug>), so it has to be unique
-- across the whole platform, not just within a tenant. Existing data can already contain
-- cross-tenant duplicates, so disambiguate them before adding the constraint: the oldest
-- row keeps the bare slug and every later one gets a numeric suffix.
WITH ranked AS (
  SELECT
    id,
    slug,
    row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS position
  FROM "establishments"
)
UPDATE "establishments" AS e
SET "slug" = ranked.slug || '-' || ranked.position
FROM ranked
WHERE e.id = ranked.id
  AND ranked.position > 1;

-- The per-tenant constraint is now redundant: a globally unique slug is strictly stronger.
DROP INDEX IF EXISTS "establishments_tenant_id_slug_key";

CREATE UNIQUE INDEX "establishments_slug_key" ON "establishments"("slug");

-- The public directory filters by city, so it gets its own index.
CREATE INDEX "establishments_address_city_idx" ON "establishments"("address_city");
