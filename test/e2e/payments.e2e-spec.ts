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

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ownerToken: string;
  let tenantId: string;
  let establishmentId: string;
  let serviceId: string;
  let employeeId: string;
  let clientToken: string;
  let appointmentId: string;

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
      .send({
        name: 'Filial Centro',
        slug: 'filial-centro',
        depositEnabled: true,
        depositPercentage: 30,
      })
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

    const booked = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T09:00:00.000Z` })
      .expect(201);
    appointmentId = booked.body.id;
  }, 20000);

  it('creates a local payment for the full price and lets staff mark it paid', async () => {
    const created = await request(app.getHttpServer())
      .post(`${base()}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ appointmentId, method: 'cash', paymentType: 'local' })
      .expect(201);

    expect(created.body.amountCents).toBe(10000);
    expect(created.body.status).toBe('pending');
    expect(created.body.externalReference).toBeNull();

    const marked = await request(app.getHttpServer())
      .patch(`${base()}/payments/${created.body.id}/mark-paid`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(marked.body.status).toBe('paid');

    const listed = await request(app.getHttpServer())
      .get(`${base()}/payments`)
      .query({ appointmentId })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].status).toBe('paid');
  });

  it('creates a deposit payment for a percentage of the price via the sandbox gateway', async () => {
    const created = await request(app.getHttpServer())
      .post(`${base()}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ appointmentId, method: 'pix', paymentType: 'deposit' })
      .expect(201);

    expect(created.body.amountCents).toBe(3000);
    expect(created.body.status).toBe('pending');
    expect(created.body.externalReference).toEqual(expect.stringContaining('sandbox_'));
  });

  it('rejects a deposit payment when the establishment has no deposit policy', async () => {
    await request(app.getHttpServer())
      .patch(base())
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ depositEnabled: false })
      .expect(200);

    await request(app.getHttpServer())
      .post(`${base()}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ appointmentId, method: 'pix', paymentType: 'deposit' })
      .expect(400);
  });

  it('confirms a payment via the webhook using the shared secret', async () => {
    const created = await request(app.getHttpServer())
      .post(`${base()}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ appointmentId, method: 'pix', paymentType: 'full' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/payments/webhook')
      .set('x-webhook-secret', 'wrong-secret')
      .send({ externalReference: created.body.externalReference, status: 'paid' })
      .expect(401);

    const confirmed = await request(app.getHttpServer())
      .post('/payments/webhook')
      .set('x-webhook-secret', 'test-webhook-secret')
      .send({ externalReference: created.body.externalReference, status: 'paid' })
      .expect(200);
    expect(confirmed.body.status).toBe('paid');
  });
});
