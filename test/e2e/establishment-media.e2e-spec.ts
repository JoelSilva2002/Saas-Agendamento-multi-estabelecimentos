import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import sharp from 'sharp';
import { createTestApp } from '../test-utils/test-app.factory';
import { resetDatabase } from '../test-utils/db-reset';
import {
  createPlatformAdmin,
  createTenantWithOwner,
  getRoleIdByName,
  login,
  PLATFORM_ADMIN_PASSWORD,
} from '../test-utils/fixtures';

describe('Establishment media (e2e)', () => {
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

  async function pngBuffer(width = 800, height = 600): Promise<Buffer> {
    return sharp({ create: { width, height, channels: 3, background: { r: 51, g: 102, b: 153 } } })
      .png()
      .toBuffer();
  }

  async function setupEstablishment() {
    const admin = await createPlatformAdmin(prisma);
    const { accessToken: platformAdminToken } = await login(app, admin.email, PLATFORM_ADMIN_PASSWORD);
    const tenant = await createTenantWithOwner(app, platformAdminToken);
    const { accessToken: ownerToken } = await login(app, tenant.ownerEmail, tenant.ownerPassword);

    // createTenantWithOwner provisions one establishment automatically (CreateTenantRequestDto
    // requires establishmentName/establishmentSlug) — fetch its id rather than creating another.
    const establishments = await request(app.getHttpServer())
      .get(`/tenants/${tenant.tenantId}/establishments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    return {
      tenantId: tenant.tenantId,
      establishmentId: establishments.body[0].id,
      slug: establishments.body[0].slug,
      ownerToken,
    };
  }

  function mediaPathFrom(absoluteUrl: string): string {
    return new URL(absoluteUrl).pathname;
  }

  it('uploads a logo, exposes it on the public detail page, and serves it with immutable caching', async () => {
    const { tenantId, establishmentId, slug, ownerToken } = await setupEstablishment();
    const png = await pngBuffer();

    const uploaded = await request(app.getHttpServer())
      .put(`/tenants/${tenantId}/establishments/${establishmentId}/media/logo`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', png, { filename: 'logo.png', contentType: 'image/png' })
      .expect(200);

    expect(uploaded.body.logoUrl).toEqual(expect.any(String));
    expect(uploaded.body.logoThumbUrl).toEqual(expect.any(String));

    const detail = await request(app.getHttpServer()).get(`/public/establishments/${slug}`).expect(200);
    expect(detail.body.logoUrl).toBe(uploaded.body.logoUrl);
    expect(detail.body.logoThumbUrl).toBe(uploaded.body.logoThumbUrl);

    const served = await request(app.getHttpServer()).get(mediaPathFrom(uploaded.body.logoUrl)).expect(200);
    expect(served.headers['content-type']).toBe('image/webp');
    expect(served.headers['cache-control']).toContain('immutable');
  });

  it('replacing the logo issues a brand-new key and the previous one 404s', async () => {
    const { tenantId, establishmentId, ownerToken } = await setupEstablishment();
    const route = `/tenants/${tenantId}/establishments/${establishmentId}/media/logo`;

    const first = await request(app.getHttpServer())
      .put(route)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', await pngBuffer(), { filename: 'logo.png', contentType: 'image/png' })
      .expect(200);

    const second = await request(app.getHttpServer())
      .put(route)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', await pngBuffer(600, 600), { filename: 'logo2.png', contentType: 'image/png' })
      .expect(200);

    expect(second.body.logoUrl).not.toBe(first.body.logoUrl);
    await request(app.getHttpServer()).get(mediaPathFrom(first.body.logoUrl)).expect(404);
    await request(app.getHttpServer()).get(mediaPathFrom(second.body.logoUrl)).expect(200);
  });

  it('removes the logo and the public detail page reflects it', async () => {
    const { tenantId, establishmentId, slug, ownerToken } = await setupEstablishment();
    const route = `/tenants/${tenantId}/establishments/${establishmentId}/media/logo`;

    const uploaded = await request(app.getHttpServer())
      .put(route)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', await pngBuffer(), { filename: 'logo.png', contentType: 'image/png' })
      .expect(200);

    await request(app.getHttpServer()).delete(route).set('Authorization', `Bearer ${ownerToken}`).expect(204);

    const detail = await request(app.getHttpServer()).get(`/public/establishments/${slug}`).expect(200);
    expect(detail.body.logoUrl).toBeNull();
    expect(detail.body.logoThumbUrl).toBeNull();
    await request(app.getHttpServer()).get(mediaPathFrom(uploaded.body.logoUrl)).expect(404);
  });

  it('rejects a file whose Content-Type lies about being an image', async () => {
    const { tenantId, establishmentId, ownerToken } = await setupEstablishment();

    await request(app.getHttpServer())
      .put(`/tenants/${tenantId}/establishments/${establishmentId}/media/logo`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('<html>not an image</html>'), {
        filename: 'evil.png',
        contentType: 'image/png',
      })
      .expect(400);
  });

  it('rejects a file over the size limit with 413, not 500', async () => {
    const { tenantId, establishmentId, ownerToken } = await setupEstablishment();
    const oversized = Buffer.alloc(6 * 1024 * 1024, 1);

    await request(app.getHttpServer())
      .put(`/tenants/${tenantId}/establishments/${establishmentId}/media/logo`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', oversized, { filename: 'huge.png', contentType: 'image/png' })
      .expect(413);
  });

  describe('gallery', () => {
    it('lists photos in position order, reorders, deletes, and enforces the cap', async () => {
      const { tenantId, establishmentId, ownerToken } = await setupEstablishment();
      const photosRoute = `/tenants/${tenantId}/establishments/${establishmentId}/media/photos`;

      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await request(app.getHttpServer())
          .post(photosRoute)
          .set('Authorization', `Bearer ${ownerToken}`)
          .attach('file', await pngBuffer(), { filename: `p${i}.png`, contentType: 'image/png' })
          .expect(201);
        ids.push(res.body.id);
      }

      const listed = await request(app.getHttpServer())
        .get(photosRoute)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(listed.body.map((p: { id: string }) => p.id)).toEqual(ids);

      const reordered = [ids[2], ids[0], ids[1]];
      const reorderRes = await request(app.getHttpServer())
        .put(`${photosRoute}/order`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ photoIds: reordered })
        .expect(200);
      expect(reorderRes.body.map((p: { id: string }) => p.id)).toEqual(reordered);

      await request(app.getHttpServer())
        .delete(`${photosRoute}/${ids[0]}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const afterDelete = await request(app.getHttpServer())
        .get(photosRoute)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(afterDelete.body).toHaveLength(2);

      // MEDIA_MAX_GALLERY_PHOTOS defaults to 12; 2 remain, so 10 more fill it exactly.
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post(photosRoute)
          .set('Authorization', `Bearer ${ownerToken}`)
          .attach('file', await pngBuffer(), { filename: `fill${i}.png`, contentType: 'image/png' })
          .expect(201);
      }

      await request(app.getHttpServer())
        .post(photosRoute)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', await pngBuffer(), { filename: 'overflow.png', contentType: 'image/png' })
        .expect(409);
    }, 30000);
  });

  describe('authorization', () => {
    it('returns 404 (not 403) when a user from another tenant reaches this establishment', async () => {
      const target = await setupEstablishment();
      const other = await setupEstablishment();

      await request(app.getHttpServer())
        .put(`/tenants/${target.tenantId}/establishments/${target.establishmentId}/media/logo`)
        .set('Authorization', `Bearer ${other.ownerToken}`)
        .attach('file', await pngBuffer(), { filename: 'logo.png', contentType: 'image/png' })
        .expect(404);
    });

    it('returns 403 for a role with establishment:read but not establishment:update', async () => {
      const { tenantId, establishmentId, ownerToken } = await setupEstablishment();
      const roleId = await getRoleIdByName(prisma, 'employee');
      const email = `employee-${Math.random().toString(36).slice(2, 8)}@test.local`;
      const invited = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/users/invite`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email, firstName: 'Employee', lastName: 'User', roleId, establishmentId })
        .expect(201);
      const { accessToken: employeeToken } = await login(app, email, invited.body.temporaryPassword);

      // Read is allowed (establishment:read)...
      await request(app.getHttpServer())
        .get(`/tenants/${tenantId}/establishments/${establishmentId}/media/photos`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      // ...but mutating the logo requires establishment:update, which this role lacks.
      await request(app.getHttpServer())
        .put(`/tenants/${tenantId}/establishments/${establishmentId}/media/logo`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .attach('file', await pngBuffer(), { filename: 'logo.png', contentType: 'image/png' })
        .expect(403);
    });
  });

  it('never includes a photos array on the search/list endpoint', async () => {
    const { tenantId, establishmentId, ownerToken } = await setupEstablishment();
    await request(app.getHttpServer())
      .put(`/tenants/${tenantId}/establishments/${establishmentId}/media/logo`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', await pngBuffer(), { filename: 'logo.png', contentType: 'image/png' })
      .expect(200);

    const list = await request(app.getHttpServer()).get('/public/establishments').expect(200);
    const entry = list.body.find((e: { establishmentId: string }) => e.establishmentId === establishmentId);
    expect(entry.logoThumbUrl).toEqual(expect.any(String));
    expect(entry.photos).toBeUndefined();
  });

  it('rejects a percent-encoded traversal attempt on the serving route', async () => {
    await request(app.getHttpServer()).get('/media/%2e%2e%2f%2e%2e%2fpackage.json').expect(404);
  });
});
