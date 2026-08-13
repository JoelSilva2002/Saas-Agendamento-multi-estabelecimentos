import { PasswordResetToken } from './entities/password-reset-token.entity';

export interface CreatePasswordResetTokenParams {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export abstract class PasswordResetTokenRepositoryPort {
  abstract create(params: CreatePasswordResetTokenParams): Promise<PasswordResetToken>;
  abstract findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  /** Most recently created token for this user, regardless of validity — backs the request
   * cooldown (RequestPasswordResetUseCase), which cares about request frequency, not whether
   * that particular token is still usable. */
  abstract findMostRecentForUser(userId: string): Promise<PasswordResetToken | null>;
  abstract revoke(id: string): Promise<void>;
  abstract revokeAllForUser(userId: string): Promise<void>;
}
