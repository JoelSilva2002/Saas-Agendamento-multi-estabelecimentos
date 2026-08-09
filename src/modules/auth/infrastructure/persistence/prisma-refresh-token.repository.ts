import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import {
  CreateRefreshTokenParams,
  RefreshTokenRepositoryPort,
} from '../../domain/refresh-token.repository.port';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateRefreshTokenParams): Promise<RefreshToken> {
    const created = await this.prisma.refreshToken.create({ data: params });
    return RefreshToken.fromPersistence(created);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const found = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return found ? RefreshToken.fromPersistence(found) : null;
  }

  async revoke(id: string, replacedByTokenId?: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByTokenId: replacedByTokenId ?? undefined },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
