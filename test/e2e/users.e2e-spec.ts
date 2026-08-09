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

describe('Users invite + role management (e2e)', () => {
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

  it('invites a new user scoped to one establishment, who can then log in with the temporary password', async () => {
    const employeeRoleId = await getRoleIdByName(prisma, 'employee');

    const invite = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/users/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'new-employee@test.local',
        firstName: 'Nova',
        lastName: 'Funcionária',
        roleId: employeeRoleId,
        establishmentId,
      })
      .expect(201);

    expect(invite.body.temporaryPassword).toEqual(expect.any(String));

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'new-employee@test.local', password: invite.body.temporaryPassword })
      .expect(200);
    expect(loginResponse.body.accessToken).toEqual(expect.any(String));

    const list = await request(app.getHttpServer())
      .get(`/tenants/${tenantId}/users`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(list.body.map((u: { email: string }) => u.email)).toContain('new-employee@test.local');
  });

  it('rejects inviting an email that is already a member of the tenant', async () => {
    const employeeRoleId = await getRoleIdByName(prisma, 'employee');
    const dto = {
      email: 'duplicate@test.local',
      firstName: 'Dup',
      lastName: 'User',
      roleId: employeeRoleId,
      establishmentId,
    };

    await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/users/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(dto)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/users/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(dto)
      .expect(409);
  });

  it("upgrading a user's role changes what they are permitted to do", async () => {
    const employeeRoleId = await getRoleIdByName(prisma, 'employee');
    const managerRoleId = await getRoleIdByName(prisma, 'manager');

    const invite = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/users/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'promoted@test.local',
        firstName: 'Promo',
        lastName: 'User',
        roleId: employeeRoleId,
        establishmentId,
      })
      .expect(201);

    const { accessToken: employeeToken } = await login(app, 'promoted@test.local', invite.body.temporaryPassword);

    // Employees cannot update an establishment.
    await request(app.getHttpServer())
      .patch(`/tenants/${tenantId}/establishments/${establishmentId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Tentativa Bloqueada' })
      .expect(403);

    const userId = (
      await request(app.getHttpServer())
        .get(`/tenants/${tenantId}/users`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)
    ).body.find((u: { email: string }) => u.email === 'promoted@test.local').id;

    // Promote to tenant-wide manager, which does have establishment:update.
    await request(app.getHttpServer())
      .patch(`/tenants/${tenantId}/users/${userId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: managerRoleId })
      .expect(200);

    const { accessToken: managerToken } = await login(app, 'promoted@test.local', invite.body.temporaryPassword);

    await request(app.getHttpServer())
      .patch(`/tenants/${tenantId}/establishments/${establishmentId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Agora Permitido' })
      .expect(200);
  });
});
