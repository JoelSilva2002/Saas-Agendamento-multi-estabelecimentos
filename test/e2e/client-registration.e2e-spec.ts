import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../test-utils/test-app.factory';
import { resetDatabase } from '../test-utils/db-reset';
import { createPlatformAdmin, createTenantWithOwner, login, PLATFORM_ADMIN_PASSWORD } from '../test-utils/fixtures';

describe('Client self-registration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantId: string;
  let establishmentId: string;
  let otherTenantId: string;

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
    const ownerToken = (await login(app, tenant.ownerEmail, tenant.ownerPassword)).accessToken;
    const establishment = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filial Centro', slug: 'filial-centro' })
      .expect(201);
    establishmentId = establishment.body.id;

    const otherTenant = await createTenantWithOwner(app, platformAdminToken);
    otherTenantId = otherTenant.tenantId;
  });

  const registerDto = () => ({
    tenantId,
    establishmentId,
    email: 'new-client@test.local',
    password: 'SenhaForte123',
    firstName: 'Nova',
    lastName: 'Cliente',
    phone: '+55 11 90000-0000',
  });

  it('registers a client publicly and lets them log in right after', async () => {
    const registered = await request(app.getHttpServer()).post('/auth/register').send(registerDto()).expect(201);

    expect(registered.body.user.email).toBe('new-client@test.local');
    expect(registered.body.clientProfile.establishmentId).toBe(establishmentId);

    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'new-client@test.local', password: 'SenhaForte123' })
      .expect(200);
    expect(loggedIn.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects registration with an email that already exists', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(registerDto()).expect(201);
    await request(app.getHttpServer()).post('/auth/register').send(registerDto()).expect(409);
  });

  it('returns 404 when the establishment does not belong to the given tenant', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...registerDto(), tenantId: otherTenantId })
      .expect(404);
  });

  it('grants a registered client read access to services but not to administrative resources', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(registerDto()).expect(201);
    const { accessToken: clientToken } = await login(app, 'new-client@test.local', 'SenhaForte123');

    await request(app.getHttpServer())
      .get(`/tenants/${tenantId}/establishments/${establishmentId}/services`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/tenants/${tenantId}/establishments`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });
});
