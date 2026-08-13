import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from '../test-utils/test-app.factory';
import { resetDatabase } from '../test-utils/db-reset';
import { createTenantWithOwner, createPlatformAdmin, login, PLATFORM_ADMIN_PASSWORD } from '../test-utils/fixtures';
import { EmailNotifierPort } from '../../src/modules/notifications/domain/email-notifier.port';

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

  describe('password reset', () => {
    // The real ResendEmailNotifier runs (no test double swapped in) — without a RESEND_API_KEY
    // it just logs, so we spy on the port to capture the reset link the same way a real inbox
    // would receive it, and pull the raw token out of the URL.
    function spyOnResetEmail() {
      const emailNotifier = app.get(EmailNotifierPort);
      return jest.spyOn(emailNotifier, 'send').mockResolvedValue(undefined);
    }

    function extractToken(text: string): string {
      const match = text.match(/[?&]token=([^\s&]+)/);
      if (!match) {
        throw new Error(`could not find reset token in e-mail body: ${text}`);
      }
      return match[1];
    }

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('sends a reset link for an existing e-mail and 204s either way', async () => {
      const { ownerEmail } = await seedOwner();
      const sendSpy = spyOnResetEmail();

      await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: ownerEmail }).expect(204);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy.mock.calls[0][0]).toBe(ownerEmail);

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nobody-here@test.local' })
        .expect(204);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('lets the owner set a new password with a valid token and redirects to /login', async () => {
      const { ownerEmail } = await seedOwner();
      const sendSpy = spyOnResetEmail();

      await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: ownerEmail }).expect(204);
      const token = extractToken(sendSpy.mock.calls[0][2].text);

      const reset = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'NewOwnerPassword123!' })
        .expect(200);
      expect(reset.body.redirectTo).toBe('login');

      await login(app, ownerEmail, 'NewOwnerPassword123!');
    });

    it('redirects a client-only account to /entrar after reset', async () => {
      const admin = await createPlatformAdmin(prisma);
      const { accessToken: platformAdminToken } = await login(app, admin.email, PLATFORM_ADMIN_PASSWORD);
      const tenant = await createTenantWithOwner(app, platformAdminToken);
      const ownerToken = (await login(app, tenant.ownerEmail, tenant.ownerPassword)).accessToken;
      const establishment = await request(app.getHttpServer())
        .post(`/tenants/${tenant.tenantId}/establishments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Filial Centro', slug: `filial-${randomUUID().slice(0, 8)}` })
        .expect(201);

      const clientEmail = `cliente-${randomUUID().slice(0, 8)}@test.local`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantId: tenant.tenantId,
          establishmentId: establishment.body.id,
          email: clientEmail,
          password: 'ClientPassword123!',
          firstName: 'Cliente',
          lastName: 'Teste',
        })
        .expect(201);

      const sendSpy = spyOnResetEmail();
      await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: clientEmail }).expect(204);
      const token = extractToken(sendSpy.mock.calls[0][2].text);

      const reset = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'NewClientPassword123!' })
        .expect(200);
      expect(reset.body.redirectTo).toBe('entrar');
    });

    it('lets a walk-in client with no password yet claim their first login via reset', async () => {
      const walkInEmail = `walkin-${randomUUID().slice(0, 8)}@test.local`;
      await prisma.user.create({
        data: {
          id: randomUUID(),
          email: walkInEmail,
          passwordHash: null,
          firstName: 'Walk',
          lastName: 'In',
        },
      });

      const sendSpy = spyOnResetEmail();
      await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: walkInEmail }).expect(204);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const token = extractToken(sendSpy.mock.calls[0][2].text);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'FirstPassword123!' })
        .expect(200);

      await login(app, walkInEmail, 'FirstPassword123!');
    });

    it('rejects reset with an unknown token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'not-a-real-token', newPassword: 'NewPassword123!' })
        .expect(400);
    });

    it('rejects reuse of an already-consumed reset token', async () => {
      const { ownerEmail } = await seedOwner();
      const sendSpy = spyOnResetEmail();
      await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: ownerEmail }).expect(204);
      const token = extractToken(sendSpy.mock.calls[0][2].text);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'NewOwnerPassword123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'AnotherPassword123!' })
        .expect(400);
    });

    it('does not send a second e-mail within the resend cooldown', async () => {
      const { ownerEmail } = await seedOwner();
      const sendSpy = spyOnResetEmail();

      await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: ownerEmail }).expect(204);
      await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: ownerEmail }).expect(204);

      expect(sendSpy).toHaveBeenCalledTimes(1);
    });
  });
});
