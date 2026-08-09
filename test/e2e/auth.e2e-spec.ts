import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../test-utils/test-app.factory';
import { resetDatabase } from '../test-utils/db-reset';
import { createTenantWithOwner, createPlatformAdmin, login, PLATFORM_ADMIN_PASSWORD } from '../test-utils/fixtures';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

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
  });

  async function seedOwner() {
    const admin = await createPlatformAdmin(prisma);
    const { accessToken } = await login(app, admin.email, PLATFORM_ADMIN_PASSWORD);
    return createTenantWithOwner(app, accessToken);
  }

  it('logs in with valid credentials and returns access + refresh tokens', async () => {
    const { ownerEmail, ownerPassword } = await seedOwner();

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ownerEmail, password: ownerPassword })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
  });

  it('rejects login with wrong password', async () => {
    const { ownerEmail } = await seedOwner();

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ownerEmail, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects a protected route without an Authorization header', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('rejects a protected route with a malformed token', async () => {
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', 'Bearer not-a-real-token').expect(401);
  });

  it('rotates the refresh token and rejects the old one on reuse', async () => {
    const { ownerEmail, ownerPassword } = await seedOwner();
    const { refreshToken } = await login(app, ownerEmail, ownerPassword);

    const refreshed = await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(200);
    expect(refreshed.body.refreshToken).not.toBe(refreshToken);

    // Reusing the now-revoked original token must fail (reuse detection).
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);

    // ...and it must revoke the whole chain: the token issued right after it is also dead now.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(401);
  });

  it('invalidates the refresh token on logout', async () => {
    const { ownerEmail, ownerPassword } = await seedOwner();
    const { refreshToken } = await login(app, ownerEmail, ownerPassword);

    await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken }).expect(204);
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);
  });
});
