import { Establishment as PrismaEstablishment } from '@prisma/client';
import { Establishment } from '../../domain/entities/establishment.entity';

export class EstablishmentMapper {
  static toDomain(record: PrismaEstablishment): Establishment {
    return Establishment.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      slug: record.slug,
      timezone: record.timezone,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(establishment: Establishment) {
    return establishment.toPersistenceProps();
  }
}
