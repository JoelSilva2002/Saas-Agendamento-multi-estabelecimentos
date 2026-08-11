import { CreateTenantUseCase } from './create-tenant.use-case';
import { TenantRepositoryPort } from '../../domain/tenant.repository.port';
import { RoleRepositoryPort } from '../../../rbac/domain/role.repository.port';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { Establishment } from '../../../establishments/domain/entities/establishment.entity';
import { DuplicateTenantSlugError } from '../../domain/errors/tenant-errors';
import { RoleNotFoundError } from '../../../rbac/domain/errors/rbac-errors';
import { Role } from '../../../rbac/domain/entities/role.entity';
import { Tenant } from '../../domain/entities/tenant.entity';

describe('CreateTenantUseCase', () => {
  const ownerRole = Role.fromPersistence({
    id: 'role-owner',
    name: 'owner',
    description: 'Owner',
    isSystem: true,
    permissionKeys: ['establishment:create'],
  });

  function buildUseCase(overrides?: {
    tenantRepository?: Partial<TenantRepositoryPort>;
    roleRepository?: Partial<RoleRepositoryPort>;
    passwordHasher?: Partial<PasswordHasherPort>;
    establishmentRepository?: Partial<EstablishmentRepositoryPort>;
  }) {
    const tenantRepository: TenantRepositoryPort = {
      existsWithSlug: jest.fn().mockResolvedValue(false),
      createWithOwner: jest.fn().mockResolvedValue({
        tenant: Tenant.fromPersistence({
          id: 't1',
          name: 'Barbearia',
          slug: 'barbearia',
          document: null,
          plan: 'free',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        ownerUserId: 'owner-1',
      }),
      findById: jest.fn(),
      findAll: jest.fn(),
      ...overrides?.tenantRepository,
    } as unknown as TenantRepositoryPort;

    const roleRepository: RoleRepositoryPort = {
      findByName: jest.fn().mockResolvedValue(ownerRole),
      findById: jest.fn(),
      findAll: jest.fn(),
      ...overrides?.roleRepository,
    } as unknown as RoleRepositoryPort;

    const passwordHasher: PasswordHasherPort = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      verify: jest.fn(),
      ...overrides?.passwordHasher,
    } as unknown as PasswordHasherPort;

    const establishmentRepository: EstablishmentRepositoryPort = {
      create: jest.fn().mockImplementation((establishment: Establishment) => Promise.resolve(establishment)),
      findById: jest.fn(),
      existsInTenant: jest.fn(),
      findAllByTenant: jest.fn(),
      findAllActive: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      existsWithSlug: jest.fn(),
      ...overrides?.establishmentRepository,
    } as unknown as EstablishmentRepositoryPort;

    return {
      useCase: new CreateTenantUseCase(tenantRepository, roleRepository, passwordHasher, establishmentRepository),
      tenantRepository,
      roleRepository,
      passwordHasher,
      establishmentRepository,
    };
  }

  const input = {
    name: 'Barbearia',
    slug: 'barbearia',
    ownerEmail: 'owner@example.com',
    ownerFirstName: 'Ana',
    ownerLastName: 'Silva',
    ownerPassword: 'SenhaForte123',
    establishmentName: 'Barbearia - Unidade 1',
    establishmentSlug: 'unidade-1',
  };

  it('creates the tenant with its owner and a first establishment in one call', async () => {
    const { useCase, tenantRepository, passwordHasher, establishmentRepository } = buildUseCase();

    const result = await useCase.execute(input);

    expect(passwordHasher.hash).toHaveBeenCalledWith('SenhaForte123');
    expect(tenantRepository.createWithOwner).toHaveBeenCalledTimes(1);
    expect(establishmentRepository.create).toHaveBeenCalledTimes(1);
    expect(result.tenant.slug).toBe('barbearia');
    expect(result.ownerUserId).toBe('owner-1');
    expect(result.establishment.slug).toBe('unidade-1');
    expect(result.temporaryPassword).toBeUndefined();
  });

  it('generates a temporary password when ownerPassword is omitted', async () => {
    const { useCase, passwordHasher } = buildUseCase();
    const { ownerPassword: _ownerPassword, ...inputWithoutPassword } = input;

    const result = await useCase.execute(inputWithoutPassword);

    expect(result.temporaryPassword).toBeDefined();
    expect(passwordHasher.hash).toHaveBeenCalledWith(result.temporaryPassword);
  });

  it('throws DuplicateTenantSlugError when the slug is already taken', async () => {
    const { useCase, tenantRepository } = buildUseCase({
      tenantRepository: { existsWithSlug: jest.fn().mockResolvedValue(true) },
    });

    await expect(useCase.execute(input)).rejects.toThrow(DuplicateTenantSlugError);
    expect(tenantRepository.createWithOwner).not.toHaveBeenCalled();
  });

  it('throws RoleNotFoundError when the owner role is not seeded', async () => {
    const { useCase } = buildUseCase({ roleRepository: { findByName: jest.fn().mockResolvedValue(null) } });

    await expect(useCase.execute(input)).rejects.toThrow(RoleNotFoundError);
  });
});
