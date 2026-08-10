import { randomUUID } from 'crypto';
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

/** Registers a client via the public self-registration endpoint and logs them in — used to
 * exercise the `:own`-permission side of the appointments API (as opposed to staff). */
async function registerClient(
  app: INestApplication,
  tenantId: string,
  establishmentId: string,
  slug: string,
): Promise<{ accessToken: string; userId: string }> {
  const email = `${slug}-${randomUUID()}@test.local`;
  const password = 'ClientPassword123!';
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ tenantId, establishmentId, email, password, firstName: 'Cliente', lastName: 'Teste' })
    .expect(201);

  const { accessToken } = await login(app, email, password);
  return { accessToken, userId: response.body.user.id };
}

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
// Always far enough in the future to be unaffected by the "no past slots" filter,
// regardless of when the test suite happens to run.
const FUTURE_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const PAST_DATE = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe('Appointments availability engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ownerToken: string;
  let ownerUserId: string;
  let tenantId: string;
  let establishmentId: string;
  let serviceId: string;
  let employeeId: string;
  let clientToken: string;
  let clientUserId: string;
  let otherClientToken: string;
  let otherClientUserId: string;

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

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
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

    const client = await registerClient(app, tenantId, establishmentId, 'client');
    clientToken = client.accessToken;
    clientUserId = client.userId;

    const otherClient = await registerClient(app, tenantId, establishmentId, 'other-client');
    otherClientToken = otherClient.accessToken;
    otherClientUserId = otherClient.userId;
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
    expect(
      availabilityAfter.body.some((s: { startAt: string }) => s.startAt === firstSlotStart),
    ).toBe(false);
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
      .send({
        clientId: ownerUserId,
        employeeId,
        serviceId: otherService.body.id,
        startAt: `${FUTURE_DATE}T11:00:00.000Z`,
      })
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

    const appointments = await prisma.appointment.findMany({
      where: { employeeId, startAt: new Date(startAt) },
    });
    expect(appointments).toHaveLength(1);
  });

  it('lets a client book their own appointment, ignoring any spoofed clientId', async () => {
    const startAt = `${FUTURE_DATE}T15:00:00.000Z`;
    const booked = await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ clientId: otherClientUserId, employeeId, serviceId, startAt })
      .expect(201);

    expect(booked.body.clientId).toBe(clientUserId);
  });

  it('rejects a staff booking without an explicit clientId', async () => {
    await request(app.getHttpServer())
      .post(`${base()}/appointments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T15:30:00.000Z` })
      .expect(400);
  });

  describe('GET appointments/:id and GET appointments', () => {
    it('lets the owning client fetch their own appointment, but not another client', async () => {
      const startAt = `${FUTURE_DATE}T09:30:00.000Z`;
      const booked = await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ employeeId, serviceId, startAt })
        .expect(201);

      await request(app.getHttpServer())
        .get(`${base()}/appointments/${booked.body.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`${base()}/appointments/${booked.body.id}`)
        .set('Authorization', `Bearer ${otherClientToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`${base()}/appointments/${booked.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it("scopes the listing to the caller's own appointments for a client", async () => {
      await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T10:30:00.000Z` })
        .expect(201);
      await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${otherClientToken}`)
        .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T11:30:00.000Z` })
        .expect(201);

      const listed = await request(app.getHttpServer())
        .get(`${base()}/appointments`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(listed.body.length).toBeGreaterThan(0);
      expect(listed.body.every((a: { clientId: string }) => a.clientId === clientUserId)).toBe(
        true,
      );
    });
  });

  describe('cancellation', () => {
    it('lets a client cancel their own appointment within the notice window, with a reason', async () => {
      const booked = await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T09:15:00.000Z` })
        .expect(201);

      const cancelled = await request(app.getHttpServer())
        .patch(`${base()}/appointments/${booked.body.id}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ reason: 'Imprevisto pessoal' })
        .expect(200);

      expect(cancelled.body.status).toBe('cancelled');
      expect(cancelled.body.cancellationReason).toBe('Imprevisto pessoal');
    });

    it('requires a non-empty reason', async () => {
      const booked = await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T09:45:00.000Z` })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`${base()}/appointments/${booked.body.id}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ reason: '' })
        .expect(400);
    });

    it("rejects cancelling another client's appointment", async () => {
      const booked = await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T10:45:00.000Z` })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`${base()}/appointments/${booked.body.id}/cancel`)
        .set('Authorization', `Bearer ${otherClientToken}`)
        .send({ reason: 'Não é meu' })
        .expect(403);
    });

    it('rejects a client cancellation with less notice than the establishment requires, but staff can still cancel', async () => {
      await request(app.getHttpServer())
        .patch(base())
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ cancellationMinHoursNotice: 24 * 60 })
        .expect(200);

      const booked = await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T11:45:00.000Z` })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`${base()}/appointments/${booked.body.id}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ reason: 'Muito em cima da hora' })
        .expect(409);

      const staffCancelled = await request(app.getHttpServer())
        .patch(`${base()}/appointments/${booked.body.id}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Estabelecimento fechará mais cedo' })
        .expect(200);
      expect(staffCancelled.body.status).toBe('cancelled');
    });
  });

  describe('reschedule', () => {
    it('lets a client reschedule their own appointment to a free slot', async () => {
      const booked = await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T12:00:00.000Z` })
        .expect(201);

      const rescheduled = await request(app.getHttpServer())
        .patch(`${base()}/appointments/${booked.body.id}/reschedule`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ startAt: `${FUTURE_DATE}T13:00:00.000Z` })
        .expect(200);

      expect(rescheduled.body.startAt).toBe(`${FUTURE_DATE}T13:00:00.000Z`);
      expect(rescheduled.body.id).toBe(booked.body.id);
    });

    it('rejects rescheduling into a slot already taken by another appointment', async () => {
      const takenStartAt = `${FUTURE_DATE}T14:30:00.000Z`;
      await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${otherClientToken}`)
        .send({ employeeId, serviceId, startAt: takenStartAt })
        .expect(201);

      const booked = await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ employeeId, serviceId, startAt: `${FUTURE_DATE}T16:30:00.000Z` })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`${base()}/appointments/${booked.body.id}/reschedule`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ startAt: takenStartAt })
        .expect(409);
    });
  });

  describe('no-show', () => {
    it('rejects marking a future appointment as no-show', async () => {
      const booked = await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          clientId: ownerUserId,
          employeeId,
          serviceId,
          startAt: `${FUTURE_DATE}T09:00:00.000Z`,
          isFitIn: true,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`${base()}/appointments/${booked.body.id}/no-show`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('computes the no-show fee as a percentage of the service price when enabled', async () => {
      await request(app.getHttpServer())
        .patch(base())
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ noShowFeeEnabled: true, noShowFeePercentage: 50 })
        .expect(200);

      const booked = await request(app.getHttpServer())
        .post(`${base()}/appointments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          clientId: ownerUserId,
          employeeId,
          serviceId,
          startAt: `${PAST_DATE}T10:00:00.000Z`,
          isFitIn: true,
        })
        .expect(201);

      const marked = await request(app.getHttpServer())
        .patch(`${base()}/appointments/${booked.body.id}/no-show`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(marked.body.status).toBe('no_show');
      expect(marked.body.noShowFeeCents).toBe(2500);
    });
  });

  it('lists employees eligible for a given service', async () => {
    const response = await request(app.getHttpServer())
      .get(`${base()}/services/${serviceId}/employees`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(response.body.map((e: { id: string }) => e.id)).toContain(employeeId);
  });
});
