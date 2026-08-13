import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { ApiKey } from '../../domain/entities/api-key.entity';
import { ApiKeyRepositoryPort, CreateApiKeyParams } from '../../domain/api-key.repository.port';

@Injectable()
export class PrismaApiKeyRepository implements ApiKeyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateApiKeyParams): Promise<ApiKey> {
    const created = await this.prisma.apiKey.create({ data: params });
    return ApiKey.fromPersistence(created);
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const found = await this.prisma.apiKey.findUnique({ where: { keyHash } });
    return found ? ApiKey.fromPersistence(found) : null;
  }

  async findAllForEstablishment(establishmentId: string): Promise<ApiKey[]> {
    const rows = await this.prisma.apiKey.findMany({
      where: { establishmentId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(ApiKey.fromPersistence);
  }

  async findByIdInEstablishment(id: string, establishmentId: string): Promise<ApiKey | null> {
    const found = await this.prisma.apiKey.findFirst({ where: { id, establishmentId } });
    return found ? ApiKey.fromPersistence(found) : null;
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }
}
