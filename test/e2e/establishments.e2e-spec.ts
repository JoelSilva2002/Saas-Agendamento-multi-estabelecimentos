import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../test-utils/test-app.factory';
import { resetDatabase } from '../test-utils/db-reset';
import { createPlatformAdmin, createTenantWithOwner, login, PLATFORM_ADMIN_PASSWORD } from '../test-utils/fixtures';

describe('Establishments CRUD (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ownerToken: string;
  let tenantId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const admin = await createPlatformAdmin(prisma);
    const { accessToken: platformAdminToken } = await login(app, admin.email, PLATFORM_ADMIN_PASSWORD);
    const tenant = await createTenantWithOwner(app, platformAdminToken);
    tenantId = tenant.tenantId;
    ownerToken = (await login(app, tenant.ownerEmail, tenant.ownerPassword)).accessToken;
  });

  it('supports the full create → list → get → update → soft-delete lifecycle', async () => {
    const created = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial Centro', slug: 'filial-centro' })
      .expect(201);

    expect(created.body).toMatchObject({ name: 'Filial Centro', slug: 'filial-centro', timezone: 'UTC' });

    const list = await request(app.getHttpServer())
      .get(`/tenants/${tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    // Tenant creation itself provisions one establishment (see CreateTenantRequestDto's
    // establishmentName/establishmentSlug) plus the one just created above.
    expect(list.body).toHaveLength(2);
    expect(list.body).toContainEqual(expect.objectContaining({ id: created.body.id }));

    const fetched = await request(app.getHttpServer())
      .get(`/tenants/${tenantId}/establishments/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(fetched.body.id).toBe(created.body.id);

    const updated = await request(app.getHttpServer())
      .patch(`/tenants/${tenantId}/establishments/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial Centro Renovada' })
      .expect(200);
    expect(updated.body.name).toBe('Filial Centro Renovada');

    await request(app.getHttpServer())
      .delete(`/tenants/${tenantId}/establishments/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/tenants/${tenantId}/establishments/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });

  it('rejects creating an establishment with a duplicate slug in the same tenant', async () => {
    await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial Centro', slug: 'filial-centro' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Outra Filial', slug: 'filial-centro' })
      .expect(409);
  });
});
