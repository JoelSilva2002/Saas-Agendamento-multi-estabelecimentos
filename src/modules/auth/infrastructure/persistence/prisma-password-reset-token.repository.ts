import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import {
  CreatePasswordResetTokenParams,
  PasswordResetTokenRepositoryPort,
} from '../../domain/password-reset-token.repository.port';

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreatePasswordResetTokenParams): Promise<PasswordResetToken> {
    const created = await this.prisma.passwordResetToken.create({ data: params });
    return PasswordResetToken.fromPersistence(created);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const found = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    return found ? PasswordResetToken.fromPersistence(found) : null;
  }

  async findMostRecentForUser(userId: string): Promise<PasswordResetToken | null> {
    const found = await this.prisma.passwordResetToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return found ? PasswordResetToken.fromPersistence(found) : null;
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
