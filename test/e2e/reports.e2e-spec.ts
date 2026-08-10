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
const PAST_DATE = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ownerToken: string;
  let tenantId: string;
  let establishmentId: string;
  let serviceId: string;
  let employeeId: string;
  let clientToken: string;

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
      .send({ name: 'Corte', price: 100, durationMinutes: 30 })
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
  }, 20000);

  it('reflects completed appointments in top-services, employee-productivity and peak-hours', async () => {
    const booked = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ employeeId, serviceId, startAt: `${PAST_DATE}T09:00:00.000Z`, isFitIn: true })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`${base()}/appointments/${booked.body.id}/complete`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const topServices = await request(app.getHttpServer())
      .get(`${base()}/reports/top-services`)
      .query({ fromDate, toDate })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(topServices.body).toEqual([{ serviceId, count: 1, revenueCents: 10000 }]);

    const productivity = await request(app.getHttpServer())
      .get(`${base()}/reports/employee-productivity`)
      .query({ fromDate, toDate })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(productivity.body).toEqual([{ employeeId, count: 1, revenueCents: 10000 }]);

    const peakHours = await request(app.getHttpServer())
      .get(`${base()}/reports/peak-hours`)
      .query({ fromDate, toDate })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(peakHours.body).toEqual([{ hour: 9, count: 1 }]);
  });

  it('sums paid payments into the monthly revenue report', async () => {
    const booked = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ employeeId, serviceId, startAt: `${PAST_DATE}T09:00:00.000Z`, isFitIn: true })
      .expect(201);

    const payment = await request(app.getHttpServer())
      .post(`${base()}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ appointmentId: booked.body.id, method: 'cash', paymentType: 'local' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`${base()}/payments/${payment.body.id}/mark-paid`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const month = new Date().toISOString().slice(0, 7);
    const revenue = await request(app.getHttpServer())
      .get(`${base()}/reports/revenue`)
      .query({ month })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(revenue.body).toEqual({ month, revenueCents: 10000 });
  });

  it('rejects access without report:read', async () => {
    await request(app.getHttpServer())
      .get(`${base()}/reports/revenue`)
      .query({ month: '2026-03' })
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });
});
