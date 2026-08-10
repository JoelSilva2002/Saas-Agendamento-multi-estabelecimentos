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
  registerClient,
  PLATFORM_ADMIN_PASSWORD,
} from '../test-utils/fixtures';

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const FUTURE_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe('Waitlist (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ownerToken: string;
  let tenantId: string;
  let establishmentId: string;
  let serviceId: string;
  let employeeId: string;
  let clientToken: string;
  let otherClientToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const base = () => `/tenants/${tenantId}/establishments/${establishmentId}`;

  beforeEach(async () => {
    await resetDatabase(prisma);
    const admin = await createPlatformAdmin(prisma);
    const { accessToken: platformAdminToken } = await login(
      app,
      admin.email,
      PLATFORM_ADMIN_PASSWORD,
    );
    const tenant = await createTenantWithOwner(app, platformAdminToken);
    tenantId = tenant.tenantId;
    ownerToken = (await login(app, tenant.ownerEmail, tenant.ownerPassword)).accessToken;

    const establishment = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial Centro', slug: 'filial-centro' })
      .expect(201);
    establishmentId = establishment.body.id;

    await request(app.getHttpServer())
      .put(`${base()}/business-hours`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        days: ALL_WEEKDAYS.map((weekday) => ({
          weekday,
          isClosed: false,
          openTime: '09:00',
          closeTime: '18:00',
        })),
      })
      .expect(200);

    const service = await request(app.getHttpServer())
      .post(`${base()}/services`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Corte', price: 50, durationMinutes: 30 })
      .expect(201);
    serviceId = service.body.id;

    const employeeRoleId = await getRoleIdByName(prisma, 'employee');
    const invite = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/users/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'barber@test.local',
        firstName: 'Bia',
        lastName: 'Barbeira',
        roleId: employeeRoleId,
        establishmentId,
      })
      .expect(201);

    const employee = await request(app.getHttpServer())
      .post(`${base()}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: invite.body.user.id, jobTitle: 'Barbeira' })
      .expect(201);
    employeeId = employee.body.id;

    await request(app.getHttpServer())
      .put(`${base()}/employees/${employeeId}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        slots: ALL_WEEKDAYS.map((weekday) => ({
          weekday,
          slotType: 'working',
          startTime: '09:00',
          endTime: '18:00',
        })),
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`${base()}/services/${serviceId}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ employeeIds: [employeeId] })
      .expect(200);

    clientToken = (await registerClient(app, tenantId, establishmentId, 'client')).accessToken;
    otherClientToken = (await registerClient(app, tenantId, establishmentId, 'other-client'))
      .accessToken;
  }, 20000);

  it('lets a client join the waitlist and see it in their own listing', async () => {
    const joined = await request(app.getHttpServer())
      .post(`${base()}/waitlist`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ serviceId, desiredDate: FUTURE_DATE })
      .expect(201);

    expect(joined.body.status).toBe('waiting');

    const listed = await request(app.getHttpServer())
      .get(`${base()}/waitlist`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    expect(listed.body).toHaveLength(1);
  });

  it('notifies a waiting client when a matching appointment is cancelled', async () => {
    await request(app.getHttpServer())
      .post(`${base()}/waitlist`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ serviceId, employeeId, desiredDate: FUTURE_DATE })
      .expect(201);

    const booked = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T09:00:00.000Z` })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`${base()}/appointments/${booked.body.id}/cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Cliente desmarcou' })
      .expect(200);

    const listed = await request(app.getHttpServer())
      .get(`${base()}/waitlist`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(listed.body[0].status).toBe('notified');
  });

  it("lets the owning client cancel their own entry, but not another client's", async () => {
    const joined = await request(app.getHttpServer())
      .post(`${base()}/waitlist`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ serviceId, desiredDate: FUTURE_DATE })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${base()}/waitlist/${joined.body.id}`)
      .set('Authorization', `Bearer ${otherClientToken}`)
      .expect(403);

    const cancelled = await request(app.getHttpServer())
      .delete(`${base()}/waitlist/${joined.body.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    expect(cancelled.body.status).toBe('cancelled');
  });
});
