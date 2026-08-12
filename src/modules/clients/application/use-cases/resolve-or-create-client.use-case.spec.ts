import { ResolveOrCreateClientUseCase } from './resolve-or-create-client.use-case';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { ClientProfileRepositoryPort } from '../../domain/client-profile.repository.port';
import { EnsureClientMembershipUseCase } from './ensure-client-membership.use-case';
import { User } from '../../../users/domain/entities/user.entity';
import { ClientProfile } from '../../domain/entities/client-profile.entity';

describe('ResolveOrCreateClientUseCase', () => {
  const ESTABLISHMENT_ID = 'establishment-1';

  function buildProfile(userId: string, phone: string | null = null): ClientProfile {
    return ClientProfile.create({
      id: `profile-${userId}`,
      establishmentId: ESTABLISHMENT_ID,
      userId,
      phone,
    });
  }

  function build(overrides?: {
    userRepository?: Partial<UserRepositoryPort>;
    clientProfileRepository?: Partial<ClientProfileRepositoryPort>;
  }) {
    const userRepository: UserRepositoryPort = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((user: User) => Promise.resolve(user)),
      update: jest.fn(),
      updatePassword: jest.fn(),
      findAllByTenant: jest.fn(),
      existsInTenant: jest.fn(),
      ...overrides?.userRepository,
    } as unknown as UserRepositoryPort;

    const clientProfileRepository: ClientProfileRepositoryPort = {
      create: jest.fn(),
      findByUserAndEstablishment: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      countCreatedBetween: jest.fn(),
      ...overrides?.clientProfileRepository,
    } as unknown as ClientProfileRepositoryPort;

    const ensureClientMembership = {
      execute: jest.fn().mockImplementation(
        async (input: { userId: string; phone?: string | null }) =>
          buildProfile(input.userId, input.phone ?? null),
      ),
    } as unknown as EnsureClientMembershipUseCase;

    return {
      useCase: new ResolveOrCreateClientUseCase(
        userRepository,
        clientProfileRepository,
        ensureClientMembership,
      ),
      userRepository,
      clientProfileRepository,
      ensureClientMembership,
    };
  }

  it('reuses an existing account when the email matches', async () => {
    const existing = User.create({
      id: 'user-1',
      email: 'maria@example.com',
      passwordHash: 'hash',
      firstName: 'Maria',
      lastName: 'Souza',
    });
    const { useCase, userRepository, ensureClientMembership } = build({
      userRepository: { findByEmail: jest.fn().mockResolvedValue(existing) },
    });

    const result = await useCase.execute({
      establishmentId: ESTABLISHMENT_ID,
      firstName: 'ignored',
      email: 'Maria@Example.com',
    });

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(result.wasCreated).toBe(false);
    expect(result.userId).toBe('user-1');
    expect(result.email).toBe('maria@example.com');
    expect(ensureClientMembership.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', establishmentId: ESTABLISHMENT_ID }),
    );
  });

  it('reuses an existing client by phone when no email is given', async () => {
    const existingProfile = buildProfile('user-2', '11999990000');
    const existingUser = User.createWalkIn({ id: 'user-2', firstName: 'Dona', lastName: 'Maria' });
    const { useCase, userRepository, clientProfileRepository } = build({
      clientProfileRepository: { findByPhone: jest.fn().mockResolvedValue(existingProfile) },
      userRepository: { findById: jest.fn().mockResolvedValue(existingUser) },
    });

    const result = await useCase.execute({
      establishmentId: ESTABLISHMENT_ID,
      firstName: 'ignored',
      phone: '(11) 99999-0000',
    });

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(clientProfileRepository.findByPhone).toHaveBeenCalledWith(
      ESTABLISHMENT_ID,
      '(11) 99999-0000',
    );
    expect(result.wasCreated).toBe(false);
    expect(result.userId).toBe('user-2');
  });

  it('creates a brand-new walk-in when neither email nor phone match anyone', async () => {
    const { useCase, userRepository } = build();

    const result = await useCase.execute({
      establishmentId: ESTABLISHMENT_ID,
      firstName: 'Nova',
      lastName: 'Cliente',
    });

    expect(userRepository.create).toHaveBeenCalledTimes(1);
    const created = (userRepository.create as jest.Mock).mock.calls[0][0] as User;
    expect(created.email).toBeNull();
    expect(created.passwordHash).toBeNull();
    expect(result.wasCreated).toBe(true);
    expect(result.firstName).toBe('Nova');
  });

  it('always calls EnsureClientMembershipUseCase, even for a reused person — idempotent linking', async () => {
    const existing = User.create({
      id: 'user-1',
      email: 'maria@example.com',
      passwordHash: 'hash',
      firstName: 'Maria',
      lastName: 'Souza',
    });
    const { useCase, ensureClientMembership } = build({
      userRepository: { findByEmail: jest.fn().mockResolvedValue(existing) },
    });

    await useCase.execute({ establishmentId: ESTABLISHMENT_ID, firstName: 'ignored', email: 'maria@example.com' });
    await useCase.execute({ establishmentId: ESTABLISHMENT_ID, firstName: 'ignored', email: 'maria@example.com' });

    expect(ensureClientMembership.execute).toHaveBeenCalledTimes(2);
  });
});
