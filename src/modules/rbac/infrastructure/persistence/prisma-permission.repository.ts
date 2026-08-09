import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Permission } from '../../domain/entities/permission.entity';
import { PermissionRepositoryPort } from '../../domain/permission.repository.port';

@Injectable()
export class PrismaPermissionRepository implements PermissionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Permission[]> {
    const permissions = await this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
    return permissions.map((permission) => Permission.fromPersistence(permission));
  }
}
