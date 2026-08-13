import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { IntegrationAuthGuard } from './integration-auth.guard';
import { VerifyApiKeyUseCase } from '../../../api-keys/application/use-cases/verify-api-key.use-case';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { ApiKey } from '../../../api-keys/domain/entities/api-key.entity';
import { Establishment } from '../../../establishments/domain/entities/establishment.entity';

describe('IntegrationAuthGuard', () => {
  const validApiKey = ApiKey.fromPersistence({
    id: 'key-1',
    establishmentId: 'establishment-1',
    name: 'Bot WhatsApp',
    keyPrefix: 'sk_live_abcd1234',
    keyHash: 'hash',
    scopes: ['appointment:read', 'appointment:create', 'appointment:update'],
    createdById: 'user-1',
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date(),
  });

  const establishment = Establishment.fromPersistence({
    id: 'establishment-1',
    tenantId: 'tenant-1',
    name: 'Studio Beleza',
    slug: 'studio-beleza',
    description: null,
    timezone: 'America/Sao_Paulo',
    address: {
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      zipCode: null,
      country: 'BR',
    },
    phones: [],
    cancellationMinHoursNotice: 24,
    noShowFeeEnabled: false,
    noShowFeePercentage: null,
    depositEnabled: false,
    depositPercentage: null,
    reminder24hEnabled: true,
    reminder2hEnabled: true,
    notifyEmailEnabled: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  function buildContext(headers: Record<string, string>) {
    const request: Record<string, unknown> = { headers };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  function build(overrides?: { apiKey?: ApiKey | null; establishment?: Establishment | null }) {
    const verifyApiKey = {
      execute: jest.fn().mockResolvedValue(overrides?.apiKey === undefined ? validApiKey : overrides.apiKey),
    } as unknown as VerifyApiKeyUseCase;

    const establishmentRepository = {
      findByIdUnscoped: jest
        .fn()
        .mockResolvedValue(overrides?.establishment === undefined ? establishment : overrides.establishment),
    } as unknown as EstablishmentRepositoryPort;

    return { guard: new IntegrationAuthGuard(verifyApiKey, establishmentRepository), verifyApiKey };
  }

  it('populates request.tenantContext and request.user for a valid Bearer key', async () => {
    const { guard, verifyApiKey } = build();
    const { context, request } = buildContext({ authorization: 'Bearer sk_live_rawsecret' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(verifyApiKey.execute).toHaveBeenCalledWith('sk_live_rawsecret');
    expect(request.tenantContext).toEqual({
      tenantId: 'tenant-1',
      establishmentId: 'establishment-1',
      roleNames: [],
      permissions: new Set(['appointment:read', 'appointment:create', 'appointment:update']),
    });
    expect(request.user).toEqual({ id: 'user-1', email: null, isPlatformAdmin: false });
    expect(request.apiKeyId).toBe('key-1');
  });

  it('throws UnauthorizedException when there is no Authorization header', async () => {
    const { guard } = build();
    const { context } = buildContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the scheme is not Bearer', async () => {
    const { guard } = build();
    const { context } = buildContext({ authorization: 'Basic sk_live_rawsecret' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the key is invalid/revoked/expired', async () => {
    const { guard } = build({ apiKey: null });
    const { context } = buildContext({ authorization: 'Bearer sk_live_bad' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the establishment behind the key no longer exists', async () => {
    const { guard } = build({ establishment: null });
    const { context } = buildContext({ authorization: 'Bearer sk_live_rawsecret' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
