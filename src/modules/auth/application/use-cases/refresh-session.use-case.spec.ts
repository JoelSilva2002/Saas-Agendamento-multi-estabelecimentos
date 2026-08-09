import { ConfigService } from '@nestjs/config';
import { RefreshSessionUseCase } from './refresh-session.use-case';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { TokenServicePort } from '../ports/token-service.port';
import { RefreshTokenRepositoryPort } from '../../domain/refresh-token.repository.port';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { User } from '../../../users/domain/entities/user.entity';
import { InvalidRefreshTokenError } from '../../domain/errors/auth-errors';
import { AppConfig } from '../../../../config/configuration';

describe('RefreshSessionUseCase', () => {
  const user = User.create({
    id: 'user-1',
    email: 'owner@example.com',
    passwordHash: 'hash',
    firstName: 'Ana',
    lastName: 'Silva',
  });

  function validRecord(): RefreshToken {
    return RefreshToken.fromPersistence({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: new Date(),
    });
  }

  function build(overrides?: { refreshTokenRepository?: Partial<RefreshTokenRepositoryPort> }) {
    const userRepository: UserRepositoryPort = {
      findById: jest.fn().mockResolvedValue(user),
    } as unknown as UserRepositoryPort;

    const tokenService: TokenServicePort = {
      hashRefreshToken: jest.fn().mockReturnValue('hashed-refresh-token'),
      generateOpaqueRefreshToken: jest.fn().mockReturnValue('new-raw-token'),
      signAccessToken: jest.fn().mockReturnValue('new-access-token'),
    } as unknown as TokenServicePort;

    const refreshTokenRepository: RefreshTokenRepositoryPort = {
      findByTokenHash: jest.fn().mockResolvedValue(validRecord()),
      create: jest.fn().mockResolvedValue(
        RefreshToken.fromPersistence({
          id: 'rt-2',
          userId: 'user-1',
          tokenHash: 'new-hashed-token',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          revokedAt: null,
          replacedByTokenId: null,
          createdAt: new Date(),
        }),
      ),
      revoke: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      ...overrides?.refreshTokenRepository,
    } as unknown as RefreshTokenRepositoryPort;

    const configService = {
      get: jest.fn().mockReturnValue({ expiresInDays: 30 }),
    } as unknown as ConfigService<AppConfig, true>;

    return {
      useCase: new RefreshSessionUseCase(userRepository, tokenService, refreshTokenRepository, configService),
      refreshTokenRepository,
    };
  }

  it('rotates the refresh token and issues a new access token', async () => {
    const { useCase, refreshTokenRepository } = build();

    const result = await useCase.execute({ refreshToken: 'raw-token' });

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-raw-token');
    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-1', 'rt-2');
  });

  it('throws for an unknown token', async () => {
    const { useCase } = build({ refreshTokenRepository: { findByTokenHash: jest.fn().mockResolvedValue(null) } });

    await expect(useCase.execute({ refreshToken: 'unknown' })).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('throws for an expired token', async () => {
    const expired = RefreshToken.fromPersistence({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: new Date(),
    });
    const { useCase } = build({ refreshTokenRepository: { findByTokenHash: jest.fn().mockResolvedValue(expired) } });

    await expect(useCase.execute({ refreshToken: 'expired' })).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('revokes the entire session chain when a revoked token is reused', async () => {
    const revoked = RefreshToken.fromPersistence({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: new Date(),
      replacedByTokenId: 'rt-2',
      createdAt: new Date(),
    });
    const { useCase, refreshTokenRepository } = build({
      refreshTokenRepository: { findByTokenHash: jest.fn().mockResolvedValue(revoked) },
    });

    await expect(useCase.execute({ refreshToken: 'reused' })).rejects.toThrow(InvalidRefreshTokenError);
    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith('user-1');
  });
});
