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

describe('RBAC + tenant isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

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
  });

  async function setupTenant() {
    const admin = await createPlatformAdmin(prisma);
    const { accessToken: platformAdminToken } = await login(app, admin.email, PLATFORM_ADMIN_PASSWORD);
    const tenant = await createTenantWithOwner(app, platformAdminToken);
    const { accessToken: ownerToken } = await login(app, tenant.ownerEmail, tenant.ownerPassword);
    return { platformAdminToken, tenant, ownerToken };
  }

  async function inviteUserWithRole(
    ownerToken: string,
    tenantId: string,
    roleName: string,
    establishmentId?: string,
  ) {
    const roleId = await getRoleIdByName(prisma, roleName);
    const email = `${roleName}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const response = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/users/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email, firstName: roleName, lastName: 'User', roleId, establishmentId })
      .expect(201);
    return { email, temporaryPassword: response.body.temporaryPassword as string };
  }

  it('rejects establishment creation from a user scoped only to a specific establishment (no tenant-wide permission)', async () => {
    const { ownerToken, tenant } = await setupTenant();
    const establishment = await request(app.getHttpServer())
      .post(`/tenants/${tenant.tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial X', slug: 'filial-x' })
      .expect(201);

    const employee = await inviteUserWithRole(ownerToken, tenant.tenantId, 'employee', establishment.body.id);
    const { accessToken: employeeToken } = await login(app, employee.email, employee.temporaryPassword);

    await request(app.getHttpServer())
      .post(`/tenants/${tenant.tenantId}/establishments`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Filial Nova', slug: 'filial-nova' })
      .expect(403);
  });

  it('allows establishment creation for the tenant owner', async () => {
    const { ownerToken, tenant } = await setupTenant();

    await request(app.getHttpServer())
      .post(`/tenants/${tenant.tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial Centro', slug: 'filial-centro' })
      .expect(201);
  });

  it('returns 404 (not 403) when a user from tenant A tries to reach tenant B resources', async () => {
    const tenantA = await setupTenant();
    const tenantB = await setupTenant();

    await request(app.getHttpServer())
      .get(`/tenants/${tenantB.tenant.tenantId}/establishments`)
      .set('Authorization', `Bearer ${tenantA.ownerToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/tenants/${tenantB.tenant.tenantId}/establishments`)
      .set('Authorization', `Bearer ${tenantA.ownerToken}`)
      .send({ name: 'Invasão', slug: 'invasao' })
      .expect(404);
  });

  it('does not let an establishment-scoped role leak into a sibling establishment', async () => {
    const { ownerToken, tenant } = await setupTenant();

    const establishmentX = await request(app.getHttpServer())
      .post(`/tenants/${tenant.tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial X', slug: 'filial-x' })
      .expect(201);

    const establishmentY = await request(app.getHttpServer())
      .post(`/tenants/${tenant.tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial Y', slug: 'filial-y' })
      .expect(201);

    const employee = await inviteUserWithRole(ownerToken, tenant.tenantId, 'employee', establishmentX.body.id);
    const { accessToken: employeeToken } = await login(app, employee.email, employee.temporaryPassword);

    await request(app.getHttpServer())
      .get(`/tenants/${tenant.tenantId}/establishments/${establishmentX.body.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/tenants/${tenant.tenantId}/establishments/${establishmentY.body.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });
});
