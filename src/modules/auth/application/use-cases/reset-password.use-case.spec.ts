import { ResetPasswordUseCase } from './reset-password.use-case';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { MembershipRepositoryPort } from '../../../rbac/domain/membership.repository.port';
import { PasswordResetTokenRepositoryPort } from '../../domain/password-reset-token.repository.port';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import { RefreshTokenRepositoryPort } from '../../domain/refresh-token.repository.port';
import { PasswordHasherPort } from '../ports/password-hasher.port';
import { TokenServicePort } from '../ports/token-service.port';
import { InvalidOrExpiredResetTokenError } from '../../domain/errors/auth-errors';

describe('ResetPasswordUseCase', () => {
  const user = User.create({
    id: 'user-1',
    email: 'ana@example.com',
    passwordHash: 'old-hash',
    firstName: 'Ana',
    lastName: 'Silva',
  });

  function validToken(overrides?: Partial<Parameters<typeof PasswordResetToken.fromPersistence>[0]>) {
    return PasswordResetToken.fromPersistence({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hashed-reset-token',
      expiresAt: new Date(Date.now() + 60 * 60_000),
      revokedAt: null,
      createdAt: new Date(),
      ...overrides,
    });
  }

  function build(overrides?: {
    passwordResetTokenRepository?: Partial<PasswordResetTokenRepositoryPort>;
    userRepository?: Partial<UserRepositoryPort>;
    membershipRepository?: Partial<MembershipRepositoryPort>;
  }) {
    const passwordResetTokenRepository: PasswordResetTokenRepositoryPort = {
      create: jest.fn(),
      findByTokenHash: jest.fn().mockResolvedValue(validToken()),
      findMostRecentForUser: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn(),
      ...overrides?.passwordResetTokenRepository,
    } as unknown as PasswordResetTokenRepositoryPort;

    const userRepository: UserRepositoryPort = {
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn().mockResolvedValue(undefined),
      findAllByTenant: jest.fn(),
      existsInTenant: jest.fn(),
      ...overrides?.userRepository,
    } as unknown as UserRepositoryPort;

    const passwordHasher: PasswordHasherPort = {
      hash: jest.fn().mockResolvedValue('new-hash'),
      verify: jest.fn(),
    } as unknown as PasswordHasherPort;

    const refreshTokenRepository: RefreshTokenRepositoryPort = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    } as unknown as RefreshTokenRepositoryPort;

    const tokenService: TokenServicePort = {
      signAccessToken: jest.fn(),
      generateOpaqueRefreshToken: jest.fn(),
      hashRefreshToken: jest.fn().mockReturnValue('hashed-reset-token'),
    } as unknown as TokenServicePort;

    const membershipRepository: MembershipRepositoryPort = {
      findAllGrantsForUser: jest.fn().mockResolvedValue([]),
      ...overrides?.membershipRepository,
    } as unknown as MembershipRepositoryPort;

    return {
      useCase: new ResetPasswordUseCase(
        passwordResetTokenRepository,
        userRepository,
        passwordHasher,
        refreshTokenRepository,
        tokenService,
        membershipRepository,
      ),
      passwordResetTokenRepository,
      userRepository,
      refreshTokenRepository,
      membershipRepository,
    };
  }

  it('updates the password, consumes the token and revokes refresh tokens on success', async () => {
    const { useCase, userRepository, passwordResetTokenRepository, refreshTokenRepository } = build();

    await useCase.execute({ token: 'raw-token', newPassword: 'newpass123' });

    expect(userRepository.updatePassword).toHaveBeenCalledWith('user-1', 'new-hash');
    expect(passwordResetTokenRepository.revoke).toHaveBeenCalledWith('token-1');
    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith('user-1');
  });

  it('returns redirectTo "entrar" for a client-only account', async () => {
    const { useCase } = build({
      membershipRepository: {
        findAllGrantsForUser: jest.fn().mockResolvedValue([
          { tenantId: 't1', establishmentId: 'e1', roleName: 'client' },
        ]),
      },
    });

    const result = await useCase.execute({ token: 'raw-token', newPassword: 'newpass123' });
    expect(result.redirectTo).toBe('entrar');
  });

  it('returns redirectTo "login" for an account with any staff grant', async () => {
    const { useCase } = build({
      membershipRepository: {
        findAllGrantsForUser: jest.fn().mockResolvedValue([
          { tenantId: 't1', establishmentId: 'e1', roleName: 'receptionist' },
        ]),
      },
    });

    const result = await useCase.execute({ token: 'raw-token', newPassword: 'newpass123' });
    expect(result.redirectTo).toBe('login');
  });

  it('returns redirectTo "entrar" for an account with no grants at all', async () => {
    const { useCase } = build();
    const result = await useCase.execute({ token: 'raw-token', newPassword: 'newpass123' });
    expect(result.redirectTo).toBe('entrar');
  });

  it('throws InvalidOrExpiredResetTokenError when no token matches the hash', async () => {
    const { useCase } = build({
      passwordResetTokenRepository: { findByTokenHash: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute({ token: 'bad-token', newPassword: 'newpass123' })).rejects.toThrow(
      InvalidOrExpiredResetTokenError,
    );
  });

  it('throws InvalidOrExpiredResetTokenError for an expired token', async () => {
    const { useCase } = build({
      passwordResetTokenRepository: {
        findByTokenHash: jest.fn().mockResolvedValue(validToken({ expiresAt: new Date(Date.now() - 1000) })),
      },
    });

    await expect(useCase.execute({ token: 'raw-token', newPassword: 'newpass123' })).rejects.toThrow(
      InvalidOrExpiredResetTokenError,
    );
  });

  it('throws InvalidOrExpiredResetTokenError for an already-used (revoked) token', async () => {
    const { useCase } = build({
      passwordResetTokenRepository: {
        findByTokenHash: jest.fn().mockResolvedValue(validToken({ revokedAt: new Date() })),
      },
    });

    await expect(useCase.execute({ token: 'raw-token', newPassword: 'newpass123' })).rejects.toThrow(
      InvalidOrExpiredResetTokenError,
    );
  });

  it('does not update the password when the token is invalid', async () => {
    const { useCase, userRepository } = build({
      passwordResetTokenRepository: { findByTokenHash: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute({ token: 'bad-token', newPassword: 'newpass123' })).rejects.toThrow();
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });
});
