import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Role } from '../../domain/entities/role.entity';
import { RoleRepositoryPort } from '../../domain/role.repository.port';

@Injectable()
export class PrismaRoleRepository implements RoleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: { include: { permission: true } } },
    });
    return role ? this.toDomain(role) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({
      where: { name },
      include: { rolePermissions: { include: { permission: true } } },
    });
    return role ? this.toDomain(role) : null;
  }

  async findAll(): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
    return roles.map((role) => this.toDomain(role));
  }

  private toDomain(role: {
    id: string;
    name: string;
    description: string;
    isSystem: boolean;
    rolePermissions: { permission: { key: string } }[];
  }): Role {
    return Role.fromPersistence({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissionKeys: role.rolePermissions.map((rp) => rp.permission.key),
    });
  }
}
