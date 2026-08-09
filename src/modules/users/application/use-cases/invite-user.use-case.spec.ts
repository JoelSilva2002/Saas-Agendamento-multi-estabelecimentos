import { InviteUserUseCase } from './invite-user.use-case';
import { UserRepositoryPort } from '../../domain/user.repository.port';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import { AssignRoleUseCase } from '../../../rbac/application/use-cases/assign-role.use-case';
import { User } from '../../domain/entities/user.entity';
import { UserAlreadyMemberError } from '../../domain/errors/user-errors';

describe('InviteUserUseCase', () => {
  const existingUser = User.create({
    id: 'user-1',
    email: 'existing@example.com',
    passwordHash: 'hash',
    firstName: 'Ana',
    lastName: 'Silva',
  });

  function build(overrides?: { userRepository?: Partial<UserRepositoryPort> }) {
    const userRepository: UserRepositoryPort = {
      findByEmail: jest.fn().mockResolvedValue(null),
      existsInTenant: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockImplementation(async (user) => user),
      findById: jest.fn(),
      update: jest.fn(),
      findAllByTenant: jest.fn(),
      ...overrides?.userRepository,
    } as unknown as UserRepositoryPort;

    const passwordHasher: PasswordHasherPort = {
      hash: jest.fn().mockResolvedValue('hashed'),
      verify: jest.fn(),
    } as unknown as PasswordHasherPort;

    const assignRoleUseCase = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as AssignRoleUseCase;

    return {
      useCase: new InviteUserUseCase(userRepository, passwordHasher, assignRoleUseCase),
      userRepository,
      assignRoleUseCase,
    };
  }

  const input = {
    tenantId: 'tenant-1',
    email: 'new@example.com',
    firstName: 'Bia',
    lastName: 'Costa',
    roleId: 'role-employee',
  };

  it('creates a new user with a temporary password and assigns the role', async () => {
    const { useCase, userRepository, assignRoleUseCase } = build();

    const result = await useCase.execute(input);

    expect(userRepository.create).toHaveBeenCalledTimes(1);
    expect(result.temporaryPassword).toBeDefined();
    expect(assignRoleUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', roleId: 'role-employee' }),
    );
  });

  it('grants membership to an existing user without creating a new account', async () => {
    const { useCase, userRepository, assignRoleUseCase } = build({
      userRepository: { findByEmail: jest.fn().mockResolvedValue(existingUser) },
    });

    const result = await useCase.execute({ ...input, email: existingUser.email });

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(result.temporaryPassword).toBeUndefined();
    expect(assignRoleUseCase.execute).toHaveBeenCalled();
  });

  it('throws UserAlreadyMemberError when the existing user already belongs to the tenant', async () => {
    const { useCase } = build({
      userRepository: {
        findByEmail: jest.fn().mockResolvedValue(existingUser),
        existsInTenant: jest.fn().mockResolvedValue(true),
      },
    });

    await expect(useCase.execute({ ...input, email: existingUser.email })).rejects.toThrow(UserAlreadyMemberError);
  });
});
