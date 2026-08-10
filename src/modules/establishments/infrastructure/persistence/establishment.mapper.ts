import { Establishment as PrismaEstablishment, Prisma } from '@prisma/client';
import { Establishment } from '../../domain/entities/establishment.entity';

export class EstablishmentMapper {
  static toDomain(record: PrismaEstablishment): Establishment {
    return Establishment.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      slug: record.slug,
      timezone: record.timezone,
      address: {
        street: record.addressStreet,
        number: record.addressNumber,
        complement: record.addressComplement,
        neighborhood: record.addressNeighborhood,
        city: record.addressCity,
        state: record.addressState,
        zipCode: record.addressZipCode,
        country: record.addressCountry,
      },
      phones: record.phones,
      cancellationMinHoursNotice: record.cancellationMinHoursNotice,
      noShowFeeEnabled: record.noShowFeeEnabled,
      noShowFeePercentage: record.noShowFeePercentage,
      depositEnabled: record.depositEnabled,
      depositPercentage: record.depositPercentage,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(establishment: Establishment): Prisma.EstablishmentUncheckedCreateInput {
    const props = establishment.toPersistenceProps();
    return {
      id: props.id,
      tenantId: props.tenantId,
      name: props.name,
      slug: props.slug,
      timezone: props.timezone,
      addressStreet: props.address.street,
      addressNumber: props.address.number,
      addressComplement: props.address.complement,
      addressNeighborhood: props.address.neighborhood,
      addressCity: props.address.city,
      addressState: props.address.state,
      addressZipCode: props.address.zipCode,
      addressCountry: props.address.country,
      phones: props.phones,
      cancellationMinHoursNotice: props.cancellationMinHoursNotice,
      noShowFeeEnabled: props.noShowFeeEnabled,
      noShowFeePercentage: props.noShowFeePercentage,
      depositEnabled: props.depositEnabled,
      depositPercentage: props.depositPercentage,
      deletedAt: props.deletedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}
