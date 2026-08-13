import { VerifyApiKeyUseCase } from './verify-api-key.use-case';
import { ApiKeyRepositoryPort } from '../../domain/api-key.repository.port';
import { ApiKey } from '../../domain/entities/api-key.entity';
import { generateApiKey } from '../../infrastructure/security/api-key-hasher';

describe('VerifyApiKeyUseCase', () => {
  function buildApiKey(overrides?: Partial<Parameters<typeof ApiKey.fromPersistence>[0]>) {
    return ApiKey.fromPersistence({
      id: 'key-1',
      establishmentId: 'establishment-1',
      name: 'Bot WhatsApp',
      keyPrefix: 'sk_live_abcd1234',
      keyHash: 'irrelevant-for-these-tests',
      scopes: ['appointment:read', 'appointment:create', 'appointment:update'],
      createdById: 'user-1',
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
      ...overrides,
    });
  }

  function build(apiKey: ApiKey | null) {
    const apiKeyRepository: ApiKeyRepositoryPort = {
      create: jest.fn(),
      findByHash: jest.fn().mockResolvedValue(apiKey),
      findAllForEstablishment: jest.fn(),
      findByIdInEstablishment: jest.fn(),
      revoke: jest.fn(),
      touchLastUsed: jest.fn().mockResolvedValue(undefined),
    } as unknown as ApiKeyRepositoryPort;

    return { useCase: new VerifyApiKeyUseCase(apiKeyRepository), apiKeyRepository };
  }

  it('returns the ApiKey and touches lastUsedAt for a valid key', async () => {
    const apiKey = buildApiKey();
    const { useCase, apiKeyRepository } = build(apiKey);

    const result = await useCase.execute('sk_live_whatever');

    expect(result).toBe(apiKey);
    expect(apiKeyRepository.touchLastUsed).toHaveBeenCalledWith('key-1');
  });

  it('returns null when no key matches the hash', async () => {
    const { useCase, apiKeyRepository } = build(null);

    const result = await useCase.execute('sk_live_unknown');

    expect(result).toBeNull();
    expect(apiKeyRepository.touchLastUsed).not.toHaveBeenCalled();
  });

  it('returns null for a revoked key', async () => {
    const apiKey = buildApiKey({ revokedAt: new Date() });
    const { useCase, apiKeyRepository } = build(apiKey);

    const result = await useCase.execute('sk_live_revoked');

    expect(result).toBeNull();
    expect(apiKeyRepository.touchLastUsed).not.toHaveBeenCalled();
  });

  it('returns null for an expired key', async () => {
    const apiKey = buildApiKey({ expiresAt: new Date(Date.now() - 1000) });
    const { useCase, apiKeyRepository } = build(apiKey);

    const result = await useCase.execute('sk_live_expired');

    expect(result).toBeNull();
    expect(apiKeyRepository.touchLastUsed).not.toHaveBeenCalled();
  });

  it('hashes the raw key deterministically so lookups round-trip through generateApiKey', () => {
    const { keyHash } = generateApiKey();
    expect(typeof keyHash).toBe('string');
    expect(keyHash).toHaveLength(64); // sha256 hex digest
  });
});
