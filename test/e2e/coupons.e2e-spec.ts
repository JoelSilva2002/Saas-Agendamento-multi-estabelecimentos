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

describe('Coupons (e2e)', () => {
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

    const booked = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T09:00:00.000Z` })
      .expect(201);
    appointmentId = booked.body.id;
  }, 20000);

  function couponPayload(overrides?: Partial<Record<string, unknown>>) {
    return {
      code: 'PROMO10',
      discountType: 'percentage',
      discountValue: 10,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2030-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('creates a coupon and applies its discount to a payment', async () => {
    await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/coupons`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(couponPayload())
      .expect(201);

    const payment = await request(app.getHttpServer())
      .post(`${base()}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ appointmentId, method: 'pix', paymentType: 'full', couponCode: 'promo10' })
      .expect(201);

    expect(payment.body.amountCents).toBe(9000);
  });

  it('rejects creating a coupon with a duplicate code in the same tenant', async () => {
    await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/coupons`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(couponPayload())
      .expect(201);

    await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/coupons`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(couponPayload())
      .expect(409);
  });

  it('rejects a payment once the coupon has reached its usage cap', async () => {
    await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/coupons`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(couponPayload({ maxUses: 1 }))
      .expect(201);

    await request(app.getHttpServer())
      .post(`${base()}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ appointmentId, method: 'pix', paymentType: 'full', couponCode: 'PROMO10' })
      .expect(201);

    const secondAppointment = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T11:00:00.000Z` })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${base()}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        appointmentId: secondAppointment.body.id,
        method: 'pix',
        paymentType: 'full',
        couponCode: 'PROMO10',
      })
      .expect(400);
  });

  it('deactivates a coupon so it can no longer be redeemed', async () => {
    const created = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/coupons`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(couponPayload())
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/tenants/${tenantId}/coupons/${created.body.id}/deactivate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`${base()}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ appointmentId, method: 'pix', paymentType: 'full', couponCode: 'PROMO10' })
      .expect(400);
  });
});
