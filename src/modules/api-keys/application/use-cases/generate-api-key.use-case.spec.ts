import { GenerateApiKeyUseCase, API_KEY_SCOPES } from './generate-api-key.use-case';
import { ApiKeyRepositoryPort } from '../../domain/api-key.repository.port';
import { ApiKey } from '../../domain/entities/api-key.entity';

describe('GenerateApiKeyUseCase', () => {
  function build() {
    const apiKeyRepository: ApiKeyRepositoryPort = {
      create: jest.fn().mockImplementation((params) =>
        Promise.resolve(
          ApiKey.fromPersistence({
            ...params,
            lastUsedAt: null,
            revokedAt: null,
            createdAt: new Date('2026-08-12T00:00:00.000Z'),
          }),
        ),
      ),
      findByHash: jest.fn(),
      findAllForEstablishment: jest.fn(),
      findByIdInEstablishment: jest.fn(),
      revoke: jest.fn(),
      touchLastUsed: jest.fn(),
    } as unknown as ApiKeyRepositoryPort;

    return { useCase: new GenerateApiKeyUseCase(apiKeyRepository), apiKeyRepository };
  }

  it('persists a hash, not the raw key, and returns the raw key only in the result', async () => {
    const { useCase, apiKeyRepository } = build();

    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      name: 'Bot WhatsApp',
      createdById: 'user-1',
    });

    expect(result.rawKey).toMatch(/^sk_live_[0-9a-f]{64}$/);
    expect(result.keyPrefix).toBe(result.rawKey.slice(0, 16));

    const createArgs = (apiKeyRepository.create as jest.Mock).mock.calls[0][0];
    expect(createArgs.keyHash).not.toBe(result.rawKey);
    expect(createArgs.keyHash).toHaveLength(64);
  });

  it('grants the fixed scope set (read + create + update) to every generated key', async () => {
    const { useCase } = build();

    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      name: 'Bot WhatsApp',
      createdById: 'user-1',
    });

    expect(result.scopes).toEqual(API_KEY_SCOPES);
  });
});
