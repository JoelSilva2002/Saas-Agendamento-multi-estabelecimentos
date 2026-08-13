import { ConfigService } from '@nestjs/config';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { PasswordResetTokenRepositoryPort } from '../../domain/password-reset-token.repository.port';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import { TokenServicePort } from '../ports/token-service.port';
import { EmailNotifierPort } from '../../../notifications/domain/email-notifier.port';
import { AppConfig } from '../../../../config/configuration';

describe('RequestPasswordResetUseCase', () => {
  const activeUser = User.create({
    id: 'user-1',
    email: 'ana@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Ana',
    lastName: 'Silva',
  });

  function build(overrides?: {
    userRepository?: Partial<UserRepositoryPort>;
    passwordResetTokenRepository?: Partial<PasswordResetTokenRepositoryPort>;
    emailNotifier?: Partial<EmailNotifierPort>;
  }) {
    const userRepository: UserRepositoryPort = {
      findByEmail: jest.fn().mockResolvedValue(activeUser),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
      findAllByTenant: jest.fn(),
      existsInTenant: jest.fn(),
      ...overrides?.userRepository,
    } as unknown as UserRepositoryPort;

    const passwordResetTokenRepository: PasswordResetTokenRepositoryPort = {
      create: jest.fn().mockResolvedValue(undefined),
      findByTokenHash: jest.fn(),
      findMostRecentForUser: jest.fn().mockResolvedValue(null),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      ...overrides?.passwordResetTokenRepository,
    } as unknown as PasswordResetTokenRepositoryPort;

    const tokenService: TokenServicePort = {
      signAccessToken: jest.fn(),
      generateOpaqueRefreshToken: jest.fn().mockReturnValue('raw-reset-token'),
      hashRefreshToken: jest.fn().mockReturnValue('hashed-reset-token'),
    } as unknown as TokenServicePort;

    const emailNotifier: EmailNotifierPort = {
      send: jest.fn().mockResolvedValue(undefined),
      ...overrides?.emailNotifier,
    } as unknown as EmailNotifierPort;

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'passwordReset') return { expiresInMinutes: 60, cooldownMinutes: 2 };
        if (key === 'frontendUrl') return 'http://localhost:3001';
        throw new Error(`unexpected config key '${key}'`);
      }),
    } as unknown as ConfigService<AppConfig, true>;

    return {
      useCase: new RequestPasswordResetUseCase(
        userRepository,
        passwordResetTokenRepository,
        tokenService,
        emailNotifier,
        configService,
      ),
      userRepository,
      passwordResetTokenRepository,
      emailNotifier,
    };
  }

  it('creates a token and sends the reset e-mail for an existing active user', async () => {
    const { useCase, passwordResetTokenRepository, emailNotifier } = build();

    await useCase.execute({ email: 'ANA@example.com  ' });

    expect(passwordResetTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', tokenHash: 'hashed-reset-token' }),
    );
    expect(emailNotifier.send).toHaveBeenCalledWith(
      'ana@example.com',
      'Redefinição de senha',
      expect.objectContaining({ html: expect.any(String), text: expect.any(String) }),
    );
  });

  it('resolves without creating a token when no user matches the e-mail (enumeration defense)', async () => {
    const { useCase, passwordResetTokenRepository, emailNotifier } = build({
      userRepository: { findByEmail: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute({ email: 'ghost@example.com' })).resolves.toBeUndefined();
    expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
    expect(emailNotifier.send).not.toHaveBeenCalled();
  });

  it('resolves without sending for an inactive user', async () => {
    const inactiveUser = activeUser.update({ isActive: false });
    const { useCase, emailNotifier } = build({
      userRepository: { findByEmail: jest.fn().mockResolvedValue(inactiveUser) },
    });

    await useCase.execute({ email: 'ana@example.com' });
    expect(emailNotifier.send).not.toHaveBeenCalled();
  });

  it('sends the link to a walk-in client that has an e-mail but no password yet', async () => {
    const walkInWithEmail = User.createWalkIn({ id: 'user-2', firstName: 'Roberto', email: 'roberto@example.com' });
    const { useCase, emailNotifier } = build({
      userRepository: { findByEmail: jest.fn().mockResolvedValue(walkInWithEmail) },
    });

    await useCase.execute({ email: 'roberto@example.com' });
    expect(emailNotifier.send).toHaveBeenCalledWith(
      'roberto@example.com',
      'Redefinição de senha',
      expect.anything(),
    );
  });

  it('does not create a new token within the cooldown window of the most recent request', async () => {
    const recentToken = PasswordResetToken.fromPersistence({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'old-hash',
      expiresAt: new Date(Date.now() + 60 * 60_000),
      revokedAt: null,
      createdAt: new Date(Date.now() - 30_000), // 30s ago, cooldown is 2min
    });
    const { useCase, passwordResetTokenRepository, emailNotifier } = build({
      passwordResetTokenRepository: {
        findMostRecentForUser: jest.fn().mockResolvedValue(recentToken),
      },
    });

    await useCase.execute({ email: 'ana@example.com' });
    expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
    expect(emailNotifier.send).not.toHaveBeenCalled();
  });

  it('creates a new token once the cooldown window has passed', async () => {
    const oldToken = PasswordResetToken.fromPersistence({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'old-hash',
      expiresAt: new Date(Date.now() + 60 * 60_000),
      revokedAt: null,
      createdAt: new Date(Date.now() - 5 * 60_000), // 5min ago, cooldown is 2min
    });
    const { useCase, passwordResetTokenRepository } = build({
      passwordResetTokenRepository: {
        findMostRecentForUser: jest.fn().mockResolvedValue(oldToken),
      },
    });

    await useCase.execute({ email: 'ana@example.com' });
    expect(passwordResetTokenRepository.revokeAllForUser).toHaveBeenCalledWith('user-1');
    expect(passwordResetTokenRepository.create).toHaveBeenCalled();
  });

  it('resolves without throwing when the e-mail provider fails', async () => {
    const { useCase } = build({
      emailNotifier: { send: jest.fn().mockRejectedValue(new Error('Resend down')) },
    });

    await expect(useCase.execute({ email: 'ana@example.com' })).resolves.toBeUndefined();
  });
});
