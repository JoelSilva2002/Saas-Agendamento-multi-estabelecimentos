import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Establishment } from '../../domain/entities/establishment.entity';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
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
    const count = await this.prisma.establishment.count({ where: { id, tenantId, deletedAt: null } });
    return count > 0;
  }

  async findAllByTenant(tenantId: string): Promise<Establishment[]> {
    const records = await this.prisma.establishment.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    return records.map(EstablishmentMapper.toDomain);
  }

  async update(establishment: Establishment): Promise<Establishment> {
    const props = EstablishmentMapper.toPersistence(establishment);
    const updated = await this.prisma.establishment.update({
      where: { id: establishment.id },
      data: {
        name: props.name,
        slug: props.slug,
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

  async existsWithSlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.establishment.count({
      where: { tenantId, slug, id: excludeId ? { not: excludeId } : undefined },
    });
    return count > 0;
  }
}
