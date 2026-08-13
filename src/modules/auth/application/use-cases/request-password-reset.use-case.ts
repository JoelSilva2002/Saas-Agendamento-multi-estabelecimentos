import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { PasswordResetTokenRepositoryPort } from '../../domain/password-reset-token.repository.port';
import { TokenServicePort } from '../ports/token-service.port';
import { EmailNotifierPort } from '../../../notifications/domain/email-notifier.port';
import { buildPasswordResetEmail } from '../services/password-reset-email.template';
import { AppConfig } from '../../../../config/configuration';

export interface RequestPasswordResetInput {
  email: string;
}

/**
 * "Esqueci minha senha" — first half of the flow (see ResetPasswordUseCase for the second).
 * Deliberately does NOT check User.canAuthenticate: a walk-in client booked by staff with an
 * e-mail but no password (see User.createWalkIn) still gets the link, and successfully
 * resetting sets a password for the first time rather than "changing" one — the natural way
 * for that person to claim self-service login to an account that already has their history.
 */
@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepositoryPort,
    private readonly tokenService: TokenServicePort,
    private readonly emailNotifier: EmailNotifierPort,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /** Always resolves, regardless of outcome — whether the e-mail doesn't exist, belongs to an
   * inactive account, is within the resend cooldown, or the send itself fails. A caller can
   * never distinguish "sent" from "nothing to send" (same enumeration-defense reasoning as
   * RegisterClientUseCase's rejection of duplicate signup e-mails). */
  async execute(input: RequestPasswordResetInput): Promise<void> {
    const email = input.email.toLowerCase().trim();
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      return;
    }

    const { expiresInMinutes, cooldownMinutes } = this.configService.get('passwordReset', {
      infer: true,
    });

    const mostRecent = await this.passwordResetTokenRepository.findMostRecentForUser(user.id);
    if (mostRecent && Date.now() - mostRecent.createdAt.getTime() < cooldownMinutes * 60_000) {
      return;
    }

    // Only the newest link should ever work — an older unused one revoked here can no longer
    // be redeemed once a fresh request has been made.
    await this.passwordResetTokenRepository.revokeAllForUser(user.id);

    const rawToken = this.tokenService.generateOpaqueRefreshToken();
    const tokenHash = this.tokenService.hashRefreshToken(rawToken);
    await this.passwordResetTokenRepository.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60_000),
    });

    const frontendUrl = this.configService.get('frontendUrl', { infer: true });
    const { html, text } = buildPasswordResetEmail({
      firstName: user.firstName,
      resetUrl: `${frontendUrl}/redefinir-senha?token=${rawToken}`,
      expiresInMinutes,
    });

    try {
      // user.email is guaranteed non-null here — findByEmail above can only ever match a real
      // address (a walk-in with no e-mail at all is unreachable by this lookup).
      await this.emailNotifier.send(user.email!, 'Redefinição de senha', { html, text });
    } catch (error) {
      // Never let a Resend outage turn into a 500 for the caller — the always-resolve contract
      // above holds regardless. The user can simply try again.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha ao enviar e-mail de redefinição de senha para o usuário '${user.id}': ${message}`,
      );
    }
  }
}
