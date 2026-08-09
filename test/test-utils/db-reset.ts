import { PrismaClient } from '@prisma/client';

/** Wipes only the dynamic, test-created data — tenants, establishments, users, memberships
 * and refresh tokens. The RBAC catalog (roles/permissions/role_permissions) is seeded once
 * by the global setup and left untouched, since no test mutates it. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "refresh_tokens", "user_tenant_roles", "establishments", "users", "tenants" RESTART IDENTITY CASCADE',
  );
}
