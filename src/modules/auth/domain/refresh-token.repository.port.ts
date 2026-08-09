import { RefreshToken } from './entities/refresh-token.entity';

export interface CreateRefreshTokenParams {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export abstract class RefreshTokenRepositoryPort {
  abstract create(params: CreateRefreshTokenParams): Promise<RefreshToken>;
  abstract findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  abstract revoke(id: string, replacedByTokenId?: string): Promise<void>;
  abstract revokeAllForUser(userId: string): Promise<void>;
}
