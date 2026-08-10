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

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ownerToken: string;
  let tenantId: string;
  let establishmentId: string;
  let serviceId: string;
  let employeeId: string;

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
  }, 20000);

  it('reflects bookings and cancellations on the appointment day, and payments/new-clients on the day they happened', async () => {
    const client = await registerClient(app, tenantId, establishmentId, 'client');
    const today = new Date().toISOString().slice(0, 10);

    const kept = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T09:00:00.000Z` })
      .expect(201);

    const cancelled = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T10:00:00.000Z` })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`${base()}/appointments/${cancelled.body.id}/cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Estabelecimento fechará mais cedo' })
      .expect(200);

    // Booking happens for a future date, but the payment is marked paid (and the client
    // profile created) right now — revenue/new-clients are recognized on those real-time
    // events, not on the appointment's future date, so they show up in *today*'s summary.
    const payment = await request(app.getHttpServer())
      .post(`${base()}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ appointmentId: kept.body.id, method: 'cash', paymentType: 'local' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`${base()}/payments/${payment.body.id}/mark-paid`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const futureDaySummary = await request(app.getHttpServer())
      .get(`${base()}/dashboard/summary`)
      .query({ date: FUTURE_DATE })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(futureDaySummary.body.date).toBe(FUTURE_DATE);
    expect(futureDaySummary.body.appointments.total).toBe(2);
    expect(futureDaySummary.body.appointments.byStatus.cancelled).toBe(1);
    expect(futureDaySummary.body.cancellationRate).toBe(0.5);
    expect(futureDaySummary.body.vacantSlots).toBeGreaterThan(0);

    const todaySummary = await request(app.getHttpServer())
      .get(`${base()}/dashboard/summary`)
      .query({ date: today })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(todaySummary.body.revenueCents).toBe(10000);
    expect(todaySummary.body.newClients).toBe(1);
  });

  it('rejects access without the dashboard:read permission', async () => {
    const client = await registerClient(app, tenantId, establishmentId, 'client');

    await request(app.getHttpServer())
      .get(`${base()}/dashboard/summary`)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(403);
  });
});
