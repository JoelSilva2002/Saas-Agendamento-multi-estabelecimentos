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

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
// Always far enough in the future to be unaffected by the "no past slots" filter,
// regardless of when the test suite happens to run.
const FUTURE_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe('Appointments availability engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ownerToken: string;
  let ownerUserId: string;
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
    const { accessToken: platformAdminToken } = await login(app, admin.email, PLATFORM_ADMIN_PASSWORD);
    const tenant = await createTenantWithOwner(app, platformAdminToken);
    tenantId = tenant.tenantId;
    ownerToken = (await login(app, tenant.ownerEmail, tenant.ownerPassword)).accessToken;

    const me = await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${ownerToken}`).expect(200);
    ownerUserId = me.body.id;

    const establishment = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial Centro', slug: 'filial-centro' })
      .expect(201);
    establishmentId = establishment.body.id;

    await request(app.getHttpServer())
      .put(`${base()}/business-hours`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ days: ALL_WEEKDAYS.map((weekday) => ({ weekday, isClosed: false, openTime: '09:00', closeTime: '18:00' })) })
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
      .send({ email: 'barber@test.local', firstName: 'Bia', lastName: 'Barbeira', roleId: employeeRoleId, establishmentId })
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
      .send({ slots: ALL_WEEKDAYS.map((weekday) => ({ weekday, slotType: 'working', startTime: '09:00', endTime: '18:00' })) })
      .expect(200);

    await request(app.getHttpServer())
      .put(`${base()}/services/${serviceId}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ employeeIds: [employeeId] })
      .expect(200);
  }, 20000);

  it('lists availability spanning the working day and books the first slot', async () => {
    const availability = await request(app.getHttpServer())
      .get(`${base()}/availability`)
      .query({ serviceId, employeeId, date: FUTURE_DATE })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(availability.body.length).toBeGreaterThan(0);
    expect(availability.body[0].startAt).toBe(`${FUTURE_DATE}T09:00:00.000Z`);

    const firstSlotStart = availability.body[0].startAt;
    const booked = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ clientId: ownerUserId, employeeId, serviceId, startAt: firstSlotStart })
      .expect(201);
    expect(booked.body.status).toBe('pending');

    const availabilityAfter = await request(app.getHttpServer())
      .get(`${base()}/availability`)
      .query({ serviceId, employeeId, date: FUTURE_DATE })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(availabilityAfter.body.some((s: { startAt: string }) => s.startAt === firstSlotStart)).toBe(false);
  });

  it('rejects booking a slot that is already taken, but allows it as a fit-in', async () => {
    const startAt = `${FUTURE_DATE}T10:00:00.000Z`;

    await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ clientId: ownerUserId, employeeId, serviceId, startAt })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ clientId: ownerUserId, employeeId, serviceId, startAt })
      .expect(409);

    const fitIn = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ clientId: ownerUserId, employeeId, serviceId, startAt, isFitIn: true })
      .expect(201);
    expect(fitIn.body.isFitIn).toBe(true);
  });

  it('rejects booking an employee who is not eligible for the service', async () => {
    const otherService = await request(app.getHttpServer())
      .post(`${base()}/services`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Coloração', price: 120, durationMinutes: 60 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ clientId: ownerUserId, employeeId, serviceId: otherService.body.id, startAt: `${FUTURE_DATE}T11:00:00.000Z` })
      .expect(400);
  });

  it('allows exactly one of two concurrent bookings for the same employee/slot to succeed', async () => {
    const startAt = `${FUTURE_DATE}T14:00:00.000Z`;
    const bookOnce = () =>
      request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ clientId: ownerUserId, employeeId, serviceId, startAt });

    const [first, second] = await Promise.all([bookOnce(), bookOnce()]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const appointments = await prisma.appointment.findMany({ where: { employeeId, startAt: new Date(startAt) } });
    expect(appointments).toHaveLength(1);
  });
});
