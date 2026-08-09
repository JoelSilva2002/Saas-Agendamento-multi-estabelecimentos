import { ConfigService } from '@nestjs/config';
import { LoginUseCase } from './login.use-case';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { PasswordHasherPort } from '../ports/password-hasher.port';
import { TokenServicePort } from '../ports/token-service.port';
import { RefreshTokenRepositoryPort } from '../../domain/refresh-token.repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { InactiveUserError, InvalidCredentialsError } from '../../domain/errors/auth-errors';
import { AppConfig } from '../../../../config/configuration';

describe('LoginUseCase', () => {
  const activeUser = User.create({
    id: 'user-1',
    email: 'owner@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Ana',
    lastName: 'Silva',
  });

  function build(overrides?: {
    userRepository?: Partial<UserRepositoryPort>;
    passwordHasher?: Partial<PasswordHasherPort>;
  }) {
    const userRepository: UserRepositoryPort = {
      findByEmail: jest.fn().mockResolvedValue(activeUser),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAllByTenant: jest.fn(),
      existsInTenant: jest.fn(),
      ...overrides?.userRepository,
    } as unknown as UserRepositoryPort;

    const passwordHasher: PasswordHasherPort = {
      verify: jest.fn().mockResolvedValue(true),
      hash: jest.fn(),
      ...overrides?.passwordHasher,
    } as unknown as PasswordHasherPort;

    const tokenService: TokenServicePort = {
      signAccessToken: jest.fn().mockReturnValue('access-token'),
      generateOpaqueRefreshToken: jest.fn().mockReturnValue('raw-refresh-token'),
      hashRefreshToken: jest.fn().mockReturnValue('hashed-refresh-token'),
    } as unknown as TokenServicePort;

    const refreshTokenRepository: RefreshTokenRepositoryPort = {
      create: jest.fn().mockResolvedValue(undefined),
      findByTokenHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    } as unknown as RefreshTokenRepositoryPort;

    const configService = {
      get: jest.fn().mockReturnValue({ expiresInDays: 30 }),
    } as unknown as ConfigService<AppConfig, true>;

    return {
      useCase: new LoginUseCase(userRepository, passwordHasher, tokenService, refreshTokenRepository, configService),
      userRepository,
      passwordHasher,
      refreshTokenRepository,
    };
  }

  it('returns tokens for valid credentials', async () => {
    const { useCase, refreshTokenRepository } = build();

    const result = await useCase.execute({ email: 'owner@example.com', password: 'correct-password' });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('raw-refresh-token');
    expect(refreshTokenRepository.create).toHaveBeenCalledTimes(1);
  });

  it('throws InvalidCredentialsError when the user does not exist', async () => {
    const { useCase } = build({ userRepository: { findByEmail: jest.fn().mockResolvedValue(null) } });

    await expect(useCase.execute({ email: 'ghost@example.com', password: 'x' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('throws InvalidCredentialsError when the password does not match', async () => {
    const { useCase } = build({ passwordHasher: { verify: jest.fn().mockResolvedValue(false) } });

    await expect(useCase.execute({ email: 'owner@example.com', password: 'wrong' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('throws InactiveUserError for a deactivated user', async () => {
    const inactiveUser = activeUser.update({ isActive: false });
    const { useCase } = build({ userRepository: { findByEmail: jest.fn().mockResolvedValue(inactiveUser) } });

    await expect(useCase.execute({ email: 'owner@example.com', password: 'correct-password' })).rejects.toThrow(
      InactiveUserError,
    );
  });
});
