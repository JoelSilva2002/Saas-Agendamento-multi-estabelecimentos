import { Injectable } from '@nestjs/common';
import { RefreshTokenRepositoryPort } from '../../domain/refresh-token.repository.port';
import { TokenServicePort } from '../ports/token-service.port';

export interface LogoutInput {
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly tokenService: TokenServicePort,
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(input.refreshToken);
    const record = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (record && !record.isRevoked) {
      await this.refreshTokenRepository.revoke(record.id);
    }
  }
}
