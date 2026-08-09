import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../test-utils/test-app.factory';
import { resetDatabase } from '../test-utils/db-reset';
import {
  createPlatformAdmin,
  createTenantWithOwner,
  getRoleIdByName,
  login,
  PLATFORM_ADMIN_PASSWORD,
} from '../test-utils/fixtures';

describe('Services & Service Categories (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ownerToken: string;
  let tenantId: string;
  let establishmentId: string;

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

    const establishment = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial Centro', slug: 'filial-centro' })
      .expect(201);
    establishmentId = establishment.body.id;
  });

  const base = () => `/tenants/${tenantId}/establishments/${establishmentId}`;

  it('supports the full category + service lifecycle, including deactivation', async () => {
    const category = await request(app.getHttpServer())
      .post(`${base()}/service-categories`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cabelo' })
      .expect(201);

    const service = await request(app.getHttpServer())
      .post(`${base()}/services`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Corte', categoryId: category.body.id, price: 49.9, durationMinutes: 30 })
      .expect(201);

    expect(service.body).toMatchObject({ name: 'Corte', price: 49.9, durationMinutes: 30, status: 'active' });

    const updated = await request(app.getHttpServer())
      .patch(`${base()}/services/${service.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ price: 59.9 })
      .expect(200);
    expect(updated.body.price).toBe(59.9);

    const deactivated = await request(app.getHttpServer())
      .delete(`${base()}/services/${service.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(deactivated.body.status).toBe('inactive');
  });

  it('rejects a duplicate category name within the same establishment', async () => {
    await request(app.getHttpServer())
      .post(`${base()}/service-categories`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cabelo' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${base()}/service-categories`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cabelo' })
      .expect(409);
  });

  it('rejects service creation from an employee without service:manage', async () => {
    const employeeRoleId = await getRoleIdByName(prisma, 'employee');
    const invite = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/users/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'staff@test.local', firstName: 'Staff', lastName: 'User', roleId: employeeRoleId, establishmentId })
      .expect(201);
    const { accessToken: employeeToken } = await login(app, 'staff@test.local', invite.body.temporaryPassword);

    await request(app.getHttpServer())
      .post(`${base()}/services`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Corte', price: 49.9, durationMinutes: 30 })
      .expect(403);
  });

  it('links eligible employees to a service and rejects an employee from another establishment', async () => {
    const employeeRoleId = await getRoleIdByName(prisma, 'employee');
    const invite = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/users/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'barber@test.local', firstName: 'Bia', lastName: 'Barber', roleId: employeeRoleId, establishmentId })
      .expect(201);
    const employeeProfile = await request(app.getHttpServer())
      .post(`${base()}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: invite.body.user.id, jobTitle: 'Barbeira' })
      .expect(201);

    const service = await request(app.getHttpServer())
      .post(`${base()}/services`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Corte', price: 49.9, durationMinutes: 30 })
      .expect(201);

    const linked = await request(app.getHttpServer())
      .put(`${base()}/services/${service.body.id}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ employeeIds: [employeeProfile.body.id] })
      .expect(200);
    expect(linked.body.employeeIds).toEqual([employeeProfile.body.id]);

    await request(app.getHttpServer())
      .put(`${base()}/services/${service.body.id}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ employeeIds: ['11111111-1111-4111-8111-111111111111'] })
      .expect(400);
  });
});
