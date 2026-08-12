import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';

export const PLATFORM_ADMIN_PASSWORD = 'PlatformAdmin123!';

export async function createPlatformAdmin(
  prisma: PrismaClient,
): Promise<{ id: string; email: string }> {
  const email = `platform-admin-${randomUUID()}@test.local`;
  const passwordHash = await argon2.hash(PLATFORM_ADMIN_PASSWORD, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      isPlatformAdmin: true,
    },
  });
  return { id: user.id, email };
}

export async function getRoleIdByName(prisma: PrismaClient, name: string): Promise<string> {
  const role = await prisma.role.findUniqueOrThrow({ where: { name } });
  return role.id;
}

export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
  return { accessToken: response.body.accessToken, refreshToken: response.body.refreshToken };
}

export interface CreatedTenant {
  tenantId: string;
  ownerEmail: string;
  ownerPassword: string;
}

/** Creates a tenant + owner user via the real HTTP API (as a seeded platform admin would),
 * then logs the owner in — used by every spec that needs a ready-to-use tenant. */
export async function createTenantWithOwner(
  app: INestApplication,
  platformAdminToken: string,
  overrides?: Partial<{ name: string; slug: string; ownerEmail: string; ownerPassword: string }>,
): Promise<CreatedTenant> {
  const suffix = randomUUID().slice(0, 8);
  const ownerPassword = overrides?.ownerPassword ?? 'OwnerPassword123!';
  const ownerEmail = overrides?.ownerEmail ?? `owner-${suffix}@test.local`;

  const response = await request(app.getHttpServer())
    .post('/tenants')
    .set('Authorization', `Bearer ${platformAdminToken}`)
    .send({
      name: overrides?.name ?? `Tenant ${suffix}`,
      slug: overrides?.slug ?? `tenant-${suffix}`,
      ownerEmail,
      ownerFirstName: 'Owner',
      ownerLastName: 'User',
      ownerPassword,
    })
    .expect(201);

  return { tenantId: response.body.id, ownerEmail, ownerPassword };
}

/** Registers a client via the public self-registration endpoint and logs them in — used to
 * exercise the `:own`-permission side of the API (as opposed to staff). */
export async function registerClient(
  app: INestApplication,
  tenantId: string,
  establishmentId: string,
  slug: string,
): Promise<{ accessToken: string; userId: string }> {
  const email = `${slug}-${randomUUID()}@test.local`;
  const password = 'ClientPassword123!';
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ tenantId, establishmentId, email, password, firstName: 'Cliente', lastName: 'Teste' })
    .expect(201);

  const { accessToken } = await login(app, email, password);
  return { accessToken, userId: response.body.user.id };
}
