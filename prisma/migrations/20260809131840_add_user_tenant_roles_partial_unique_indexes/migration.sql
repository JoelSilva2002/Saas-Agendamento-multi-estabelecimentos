-- Partial unique indexes: Postgres treats NULL as distinct in a plain unique constraint,
-- so a normal @@unique in schema.prisma would not block duplicate tenant-wide grants
-- (establishment_id IS NULL). Two separate partial indexes enforce uniqueness within each
-- scope (tenant-wide vs. establishment-specific) without conflating the two.
CREATE UNIQUE INDEX "user_tenant_roles_tenant_wide_uniq"
  ON "user_tenant_roles" ("user_id", "tenant_id", "role_id")
  WHERE "establishment_id" IS NULL;

CREATE UNIQUE INDEX "user_tenant_roles_establishment_uniq"
  ON "user_tenant_roles" ("user_id", "tenant_id", "establishment_id", "role_id")
  WHERE "establishment_id" IS NOT NULL;
