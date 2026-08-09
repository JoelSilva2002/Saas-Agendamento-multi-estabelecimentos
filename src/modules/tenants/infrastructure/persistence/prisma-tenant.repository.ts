import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Tenant } from '../../domain/entities/tenant.entity';
import {
  CreateTenantWithOwnerParams,
  TenantRepositoryPort,
  TenantWithOwner,
} from '../../domain/tenant.repository.port';
import { DuplicateTenantSlugError } from '../../domain/errors/tenant-errors';
import { DuplicateEmailError } from '../../../users/domain/errors/user-errors';

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaTenantRepository implements TenantRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createWithOwner(params: CreateTenantWithOwnerParams): Promise<TenantWithOwner> {
    try {
      const tenant = await this.prisma.$transaction(async (tx) => {
        const createdTenant = await tx.tenant.create({
          data: { id: params.tenantId, name: params.tenantName, slug: params.tenantSlug },
        });

        const ownerUser = await tx.user.create({
          data: {
            id: params.ownerUserId,
            email: params.ownerEmail.toLowerCase().trim(),
            passwordHash: params.ownerPasswordHash,
            firstName: params.ownerFirstName,
            lastName: params.ownerLastName,
          },
        });

        await tx.userTenantRole.create({
          data: {
            userId: ownerUser.id,
            tenantId: createdTenant.id,
            establishmentId: null,
            roleId: params.ownerRoleId,
          },
        });

        return createdTenant;
      });

      return { tenant: this.toDomain(tenant), ownerUserId: params.ownerUserId };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION) {
        const target = (error.meta?.target as string[] | undefined) ?? [];
        if (target.includes('email')) {
          throw new DuplicateEmailError(params.ownerEmail);
        }
        throw new DuplicateTenantSlugError(params.tenantSlug);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Tenant | null> {
    const found = await this.prisma.tenant.findUnique({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async findAll(): Promise<Tenant[]> {
    const records = await this.prisma.tenant.findMany({ orderBy: { name: 'asc' } });
    return records.map((record) => this.toDomain(record));
  }

  async existsWithSlug(slug: string): Promise<boolean> {
    const count = await this.prisma.tenant.count({ where: { slug } });
    return count > 0;
  }

  private toDomain(record: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Tenant {
    return Tenant.fromPersistence({
      id: record.id,
      name: record.name,
      slug: record.slug,
      status: record.status as 'active' | 'suspended',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
