import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { MembershipRepositoryPort } from '../../../rbac/domain/membership.repository.port';
import { PasswordResetTokenRepositoryPort } from '../../domain/password-reset-token.repository.port';
import { RefreshTokenRepositoryPort } from '../../domain/refresh-token.repository.port';
import { PasswordHasherPort } from '../ports/password-hasher.port';
import { TokenServicePort } from '../ports/token-service.port';
import { InvalidOrExpiredResetTokenError } from '../../domain/errors/auth-errors';

const CLIENT_ROLE_NAME = 'client';

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface ResetPasswordOutput {
  /** Which login screen the frontend should send the user to next — mirrors
   * hasStaffAccess/hasClientAccess on the frontend (frontend/src/lib/auth/roles.ts): any grant
   * other than the bare 'client' role counts as staff. */
  redirectTo: 'login' | 'entrar';
}

/**
 * Second half of "esqueci minha senha" (see RequestPasswordResetUseCase for the first). Token
 * validity is the sole gate — deliberately does not re-check User.isActive, since a token was
 * only ever issued for an active user in the first place.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly passwordResetTokenRepository: PasswordResetTokenRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly tokenService: TokenServicePort,
    private readonly membershipRepository: MembershipRepositoryPort,
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const tokenHash = this.tokenService.hashRefreshToken(input.token);
    const resetToken = await this.passwordResetTokenRepository.findByTokenHash(tokenHash);
    if (!resetToken || !resetToken.isValid) {
      throw new InvalidOrExpiredResetTokenError();
    }

    const user = await this.userRepository.findById(resetToken.userId);
    if (!user) {
      throw new InvalidOrExpiredResetTokenError();
    }

    const newHash = await this.passwordHasher.hash(input.newPassword);
    await this.userRepository.updatePassword(user.id, newHash);

    // Single-use: this exact link can never be redeemed again.
    await this.passwordResetTokenRepository.revoke(resetToken.id);
    // Same closing move as ChangePasswordUseCase — a password reset is the account's way of
    // cutting off every session that might not be the legitimate owner.
    await this.refreshTokenRepository.revokeAllForUser(user.id);

    const grants = await this.membershipRepository.findAllGrantsForUser(user.id);
    const isStaff = user.isPlatformAdmin || grants.some((grant) => grant.roleName !== CLIENT_ROLE_NAME);

    return { redirectTo: isStaff ? 'login' : 'entrar' };
  }
}
