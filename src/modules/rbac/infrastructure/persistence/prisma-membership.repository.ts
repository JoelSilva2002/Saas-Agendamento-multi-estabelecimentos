import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Membership, MembershipGrant } from '../../domain/entities/membership.entity';
import { CreateMembershipParams, MembershipRepositoryPort } from '../../domain/membership.repository.port';
import { DuplicateMembershipError } from '../../domain/errors/rbac-errors';

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaMembershipRepository implements MembershipRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findGrantsForUserInTenant(userId: string, tenantId: string): Promise<MembershipGrant[]> {
    const rows = await this.prisma.userTenantRole.findMany({
      where: { userId, tenantId },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });

    return rows.map((row) => ({
      establishmentId: row.establishmentId,
      roleName: row.role.name,
      permissionKeys: row.role.rolePermissions.map((rp) => rp.permission.key),
    }));
  }

  async create(params: CreateMembershipParams): Promise<Membership> {
    try {
      const created = await this.prisma.userTenantRole.create({ data: params });
      return Membership.fromPersistence(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new DuplicateMembershipError();
      }
      throw error;
    }
  }

  async existsTenantWide(userId: string, tenantId: string, roleId: string): Promise<boolean> {
    const count = await this.prisma.userTenantRole.count({
      where: { userId, tenantId, roleId, establishmentId: null },
    });
    return count > 0;
  }

  async existsForEstablishment(
    userId: string,
    tenantId: string,
    establishmentId: string,
    roleId: string,
  ): Promise<boolean> {
    const count = await this.prisma.userTenantRole.count({
      where: { userId, tenantId, roleId, establishmentId },
    });
    return count > 0;
  }

  async findAllGrantsForUser(
    userId: string,
  ): Promise<Array<{ tenantId: string; establishmentId: string | null; roleName: string }>> {
    const rows = await this.prisma.userTenantRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return rows.map((row) => ({
      tenantId: row.tenantId,
      establishmentId: row.establishmentId,
      roleName: row.role.name,
    }));
  }

  async findTenantOwner(tenantId: string): Promise<{ userId: string } | null> {
    const grant = await this.prisma.userTenantRole.findFirst({
      where: { tenantId, establishmentId: null, role: { name: 'owner' } },
      select: { userId: true },
    });
    return grant ? { userId: grant.userId } : null;
  }

  async replaceGrant(params: CreateMembershipParams): Promise<Membership> {
    return this.prisma.$transaction(async (tx) => {
      await tx.userTenantRole.deleteMany({
        where: {
          userId: params.userId,
          tenantId: params.tenantId,
          establishmentId: params.establishmentId,
        },
      });
      const created = await tx.userTenantRole.create({ data: params });
      return Membership.fromPersistence(created);
    });
  }
}
