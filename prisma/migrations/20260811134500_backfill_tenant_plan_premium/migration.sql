-- Every tenant now gets the full feature set; the tiered plans (free/starter/pro/
-- enterprise) no longer exist. Normalises rows created before the default changed.
UPDATE "tenants" SET "plan" = 'premium' WHERE "plan" <> 'premium';
