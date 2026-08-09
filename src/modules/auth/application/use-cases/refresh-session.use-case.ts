import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { RefreshTokenRepositoryPort } from '../../domain/refresh-token.repository.port';
import { TokenServicePort } from '../ports/token-service.port';
import { InactiveUserError, InvalidRefreshTokenError } from '../../domain/errors/auth-errors';
import { AppConfig } from '../../../../config/configuration';

export interface RefreshSessionInput {
  refreshToken: string;
}

export interface RefreshSessionOutput {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly tokenService: TokenServicePort,
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async execute(input: RefreshSessionInput): Promise<RefreshSessionOutput> {
    const tokenHash = this.tokenService.hashRefreshToken(input.refreshToken);
    const record = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!record) {
      throw new InvalidRefreshTokenError();
    }

    if (record.isRevoked) {
      // A revoked token being presented again means it was stolen and already used by
      // someone else (or is being replayed) — kill the whole session chain for this user.
      await this.refreshTokenRepository.revokeAllForUser(record.userId);
      throw new InvalidRefreshTokenError();
    }

    if (record.isExpired) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }
    if (!user.isActive) {
      throw new InactiveUserError();
    }

    const newRawToken = this.tokenService.generateOpaqueRefreshToken();
    const newTokenHash = this.tokenService.hashRefreshToken(newRawToken);
    const newRecord = await this.refreshTokenRepository.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: this.refreshTokenExpiry(),
    });

    await this.refreshTokenRepository.revoke(record.id, newRecord.id);

    const accessToken = this.tokenService.signAccessToken({ sub: user.id, email: user.email });

    return { accessToken, refreshToken: newRawToken };
  }

  private refreshTokenExpiry(): Date {
    const days = this.configService.get('refreshToken', { infer: true }).expiresInDays;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
