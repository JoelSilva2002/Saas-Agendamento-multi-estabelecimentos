import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Establishment } from '../../domain/entities/establishment.entity';
import {
  EstablishmentRepositoryPort,
  PublicEstablishmentFilters,
} from '../../domain/establishment.repository.port';
import { EstablishmentMapper } from './establishment.mapper';

@Injectable()
export class PrismaEstablishmentRepository implements EstablishmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(establishment: Establishment): Promise<Establishment> {
    const props = EstablishmentMapper.toPersistence(establishment);
    const created = await this.prisma.establishment.create({ data: props });
    return EstablishmentMapper.toDomain(created);
  }

  async findById(id: string, tenantId: string): Promise<Establishment | null> {
    const found = await this.prisma.establishment.findFirst({ where: { id, tenantId } });
    return found ? EstablishmentMapper.toDomain(found) : null;
  }

  async existsInTenant(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.establishment.count({
      where: { id, tenantId, deletedAt: null },
    });
    return count > 0;
  }

  async findAllByTenant(tenantId: string): Promise<Establishment[]> {
    const records = await this.prisma.establishment.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    return records.map(EstablishmentMapper.toDomain);
  }

  async findAllActive(): Promise<Establishment[]> {
    const records = await this.prisma.establishment.findMany({ where: { deletedAt: null } });
    return records.map(EstablishmentMapper.toDomain);
  }

  async update(establishment: Establishment): Promise<Establishment> {
    const props = EstablishmentMapper.toPersistence(establishment);
    const updated = await this.prisma.establishment.update({
      where: { id: establishment.id },
      data: {
        name: props.name,
        slug: props.slug,
        description: props.description,
        logoStorageKey: props.logoStorageKey,
        logoThumbStorageKey: props.logoThumbStorageKey,
        timezone: props.timezone,
        addressStreet: props.addressStreet,
        addressNumber: props.addressNumber,
        addressComplement: props.addressComplement,
        addressNeighborhood: props.addressNeighborhood,
        addressCity: props.addressCity,
        addressState: props.addressState,
        addressZipCode: props.addressZipCode,
        addressCountry: props.addressCountry,
        phones: props.phones,
        cancellationMinHoursNotice: props.cancellationMinHoursNotice,
        noShowFeeEnabled: props.noShowFeeEnabled,
        noShowFeePercentage: props.noShowFeePercentage,
        depositEnabled: props.depositEnabled,
        depositPercentage: props.depositPercentage,
        reminder24hEnabled: props.reminder24hEnabled,
        reminder2hEnabled: props.reminder2hEnabled,
        notifyEmailEnabled: props.notifyEmailEnabled,
        updatedAt: props.updatedAt,
      },
    });
    return EstablishmentMapper.toDomain(updated);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.prisma.establishment.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  }

  async existsWithSlug(slug: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.establishment.count({
      where: { slug, id: excludeId ? { not: excludeId } : undefined },
    });
    return count > 0;
  }

  async findBySlug(slug: string): Promise<Establishment | null> {
    const found = await this.prisma.establishment.findFirst({ where: { slug, deletedAt: null } });
    return found ? EstablishmentMapper.toDomain(found) : null;
  }

  async findPublic(filters: PublicEstablishmentFilters): Promise<Establishment[]> {
    const records = await this.prisma.establishment.findMany({
      where: {
        deletedAt: null,
        // Only tenants in good standing show up publicly — a suspended or cancelled
        // establishment must not keep taking bookings.
        tenant: { status: 'active' },
        addressCity: filters.city ? { equals: filters.city, mode: 'insensitive' } : undefined,
        name: filters.search ? { contains: filters.search, mode: 'insensitive' } : undefined,
      },
      orderBy: { name: 'asc' },
    });
    return records.map(EstablishmentMapper.toDomain);
  }

  async findByIdUnscoped(id: string): Promise<Establishment | null> {
    const found = await this.prisma.establishment.findUnique({ where: { id } });
    return found ? EstablishmentMapper.toDomain(found) : null;
  }

  async getTimeZone(establishmentId: string): Promise<string | null> {
    const found = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: { timezone: true },
    });
    return found?.timezone ?? null;
  }

  async listCities(): Promise<string[]> {
    const rows = await this.prisma.establishment.findMany({
      where: { deletedAt: null, tenant: { status: 'active' }, addressCity: { not: null } },
      distinct: ['addressCity'],
      select: { addressCity: true },
      orderBy: { addressCity: 'asc' },
    });
    return rows.map((row) => row.addressCity!).filter((city) => city.trim().length > 0);
  }
}
