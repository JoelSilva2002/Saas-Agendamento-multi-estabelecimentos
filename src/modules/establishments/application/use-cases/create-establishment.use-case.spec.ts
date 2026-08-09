import { CreateEstablishmentUseCase } from './create-establishment.use-case';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { DuplicateEstablishmentSlugError } from '../../domain/errors/establishment-errors';

describe('CreateEstablishmentUseCase', () => {
  function buildRepo(overrides?: Partial<EstablishmentRepositoryPort>): EstablishmentRepositoryPort {
    return {
      existsWithSlug: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockImplementation(async (establishment) => establishment),
      findById: jest.fn(),
      findAllByTenant: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      existsInTenant: jest.fn(),
      ...overrides,
    } as unknown as EstablishmentRepositoryPort;
  }

  it('creates an establishment when the slug is free', async () => {
    const repository = buildRepo();
    const useCase = new CreateEstablishmentUseCase(repository);

    const result = await useCase.execute({ tenantId: 'tenant-1', name: 'Filial Centro', slug: 'filial-centro' });

    expect(result.name).toBe('Filial Centro');
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('throws DuplicateEstablishmentSlugError when the slug is already used in the tenant', async () => {
    const repository = buildRepo({ existsWithSlug: jest.fn().mockResolvedValue(true) });
    const useCase = new CreateEstablishmentUseCase(repository);

    await expect(
      useCase.execute({ tenantId: 'tenant-1', name: 'Filial Centro', slug: 'filial-centro' }),
    ).rejects.toThrow(DuplicateEstablishmentSlugError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
