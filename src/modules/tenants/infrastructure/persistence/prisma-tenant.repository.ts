import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Tenant, TenantStatus } from '../../domain/entities/tenant.entity';
import {
  CreateTenantWithOwnerParams,
  FindPaginatedTenantsParams,
  PaginatedTenants,
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

  async findPaginated(params: FindPaginatedTenantsParams): Promise<PaginatedTenants> {
    const where: Prisma.TenantWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { items: records.map((record) => this.toDomain(record)), total };
  }

  async update(tenant: Tenant): Promise<Tenant> {
    const updated = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: tenant.name,
        document: tenant.document,
        plan: tenant.plan,
        status: tenant.status,
      },
    });
    return this.toDomain(updated);
  }

  async existsWithSlug(slug: string): Promise<boolean> {
    const count = await this.prisma.tenant.count({ where: { slug } });
    return count > 0;
  }

  private toDomain(record: {
    id: string;
    name: string;
    slug: string;
    document: string | null;
    plan: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Tenant {
    return Tenant.fromPersistence({
      id: record.id,
      name: record.name,
      slug: record.slug,
      document: record.document,
      plan: record.plan,
      status: record.status as TenantStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
