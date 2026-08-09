import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { RefreshTokenRepositoryPort } from '../../domain/refresh-token.repository.port';
import { PasswordHasherPort } from '../ports/password-hasher.port';
import { TokenServicePort } from '../ports/token-service.port';
import { InactiveUserError, InvalidCredentialsError } from '../../domain/errors/auth-errors';
import { AppConfig } from '../../../../config/configuration';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; firstName: string; lastName: string };
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(input.email.toLowerCase().trim());
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new InactiveUserError();
    }

    const passwordMatches = await this.passwordHasher.verify(user.passwordHash, input.password);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const accessToken = this.tokenService.signAccessToken({ sub: user.id, email: user.email });
    const rawRefreshToken = this.tokenService.generateOpaqueRefreshToken();
    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);

    await this.refreshTokenRepository.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt: this.refreshTokenExpiry(),
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    };
  }

  private refreshTokenExpiry(): Date {
    const days = this.configService.get('refreshToken', { infer: true }).expiresInDays;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
