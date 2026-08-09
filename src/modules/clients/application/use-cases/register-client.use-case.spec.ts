import { RegisterClientUseCase } from './register-client.use-case';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import { RoleRepositoryPort } from '../../../rbac/domain/role.repository.port';
import { AssignRoleUseCase } from '../../../rbac/application/use-cases/assign-role.use-case';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { ClientProfileRepositoryPort } from '../../domain/client-profile.repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { Establishment } from '../../../establishments/domain/entities/establishment.entity';
import { Role } from '../../../rbac/domain/entities/role.entity';
import { DuplicateEmailError } from '../../../users/domain/errors/user-errors';
import { EstablishmentNotFoundError } from '../../../establishments/domain/errors/establishment-errors';

describe('RegisterClientUseCase', () => {
  const establishment = Establishment.create({ id: 'establishment-1', tenantId: 'tenant-1', name: 'Filial', slug: 'filial' });
  const clientRole = Role.fromPersistence({
    id: 'role-client',
    name: 'client',
    description: 'Cliente',
    isSystem: true,
    permissionKeys: ['appointment:create:own'],
  });

  function build(overrides?: {
    userRepository?: Partial<UserRepositoryPort>;
    establishmentRepository?: Partial<EstablishmentRepositoryPort>;
    roleRepository?: Partial<RoleRepositoryPort>;
  }) {
    const userRepository: UserRepositoryPort = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (user) => user),
      ...overrides?.userRepository,
    } as unknown as UserRepositoryPort;

    const passwordHasher: PasswordHasherPort = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
    } as unknown as PasswordHasherPort;

    const roleRepository: RoleRepositoryPort = {
      findByName: jest.fn().mockResolvedValue(clientRole),
      ...overrides?.roleRepository,
    } as unknown as RoleRepositoryPort;

    const assignRoleUseCase = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as AssignRoleUseCase;

    const establishmentRepository: EstablishmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(establishment),
      ...overrides?.establishmentRepository,
    } as unknown as EstablishmentRepositoryPort;

    const clientProfileRepository: ClientProfileRepositoryPort = {
      create: jest.fn().mockImplementation(async (profile) => profile),
    } as unknown as ClientProfileRepositoryPort;

    return {
      useCase: new RegisterClientUseCase(
        userRepository,
        passwordHasher,
        roleRepository,
        assignRoleUseCase,
        establishmentRepository,
        clientProfileRepository,
      ),
      userRepository,
      assignRoleUseCase,
      clientProfileRepository,
    };
  }

  const input = {
    tenantId: 'tenant-1',
    establishmentId: 'establishment-1',
    email: 'client@example.com',
    password: 'SenhaForte123',
    firstName: 'Ana',
    lastName: 'Cliente',
  };

  it('creates a new user, grants the client role and creates the client profile', async () => {
    const { useCase, userRepository, assignRoleUseCase, clientProfileRepository } = build();

    const result = await useCase.execute(input);

    expect(userRepository.create).toHaveBeenCalledTimes(1);
    expect(assignRoleUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 'role-client', establishmentId: 'establishment-1' }),
    );
    expect(clientProfileRepository.create).toHaveBeenCalledTimes(1);
    expect(result.user.email).toBe('client@example.com');
  });

  it('rejects when the email is already registered (no silent account reuse on a public endpoint)', async () => {
    const existingUser = User.create({
      id: 'existing-1',
      email: 'client@example.com',
      passwordHash: 'hash',
      firstName: 'Existing',
      lastName: 'User',
    });
    const { useCase, userRepository } = build({
      userRepository: { findByEmail: jest.fn().mockResolvedValue(existingUser) },
    });

    await expect(useCase.execute(input)).rejects.toThrow(DuplicateEmailError);
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('throws EstablishmentNotFoundError when the establishment does not belong to the tenant', async () => {
    const { useCase } = build({ establishmentRepository: { findById: jest.fn().mockResolvedValue(null) } });

    await expect(useCase.execute(input)).rejects.toThrow(EstablishmentNotFoundError);
  });
});
