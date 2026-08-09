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

describe('Employees (e2e)', () => {
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

  async function inviteStaff(email: string) {
    const employeeRoleId = await getRoleIdByName(prisma, 'employee');
    const invite = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/users/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email, firstName: 'Nova', lastName: 'Pessoa', roleId: employeeRoleId, establishmentId })
      .expect(201);
    return invite.body.user.id as string;
  }

  it('creates an employee profile for an already-invited user', async () => {
    const userId = await inviteStaff('barber@test.local');

    const employee = await request(app.getHttpServer())
      .post(`${base()}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, jobTitle: 'Barbeiro' })
      .expect(201);

    expect(employee.body).toMatchObject({ userId, jobTitle: 'Barbeiro', status: 'active' });
  });

  it('rejects creating an employee profile for a user who is not a tenant member', async () => {
    await request(app.getHttpServer())
      .post(`${base()}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: '11111111-1111-4111-8111-111111111111', jobTitle: 'Barbeiro' })
      .expect(400);
  });

  it('rejects a duplicate employee profile for the same user in the same establishment', async () => {
    const userId = await inviteStaff('barber2@test.local');

    await request(app.getHttpServer())
      .post(`${base()}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, jobTitle: 'Barbeiro' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${base()}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, jobTitle: 'Barbeiro Sênior' })
      .expect(409);
  });

  it('sets a weekly schedule and rejects overlapping working slots', async () => {
    const userId = await inviteStaff('barber3@test.local');
    const employee = await request(app.getHttpServer())
      .post(`${base()}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, jobTitle: 'Barbeiro' })
      .expect(201);

    const schedule = await request(app.getHttpServer())
      .put(`${base()}/employees/${employee.body.id}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        slots: [
          { weekday: 1, slotType: 'working', startTime: '09:00', endTime: '18:00' },
          { weekday: 1, slotType: 'break', startTime: '12:00', endTime: '13:00' },
        ],
      })
      .expect(200);
    expect(schedule.body).toHaveLength(2);

    const fetched = await request(app.getHttpServer())
      .get(`${base()}/employees/${employee.body.id}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(fetched.body).toHaveLength(2);

    await request(app.getHttpServer())
      .put(`${base()}/employees/${employee.body.id}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        slots: [
          { weekday: 2, slotType: 'working', startTime: '09:00', endTime: '14:00' },
          { weekday: 2, slotType: 'working', startTime: '13:00', endTime: '18:00' },
        ],
      })
      .expect(400);
  });

  it('adds, lists and removes time off entries', async () => {
    const userId = await inviteStaff('barber4@test.local');
    const employee = await request(app.getHttpServer())
      .post(`${base()}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, jobTitle: 'Barbeiro' })
      .expect(201);

    const timeOff = await request(app.getHttpServer())
      .post(`${base()}/employees/${employee.body.id}/time-off`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ type: 'vacation', startAt: '2026-01-10T00:00:00.000Z', endAt: '2026-01-20T00:00:00.000Z' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`${base()}/employees/${employee.body.id}/time-off`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`${base()}/employees/${employee.body.id}/time-off/${timeOff.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get(`${base()}/employees/${employee.body.id}/time-off`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(listAfter.body).toHaveLength(0);
  });
});
