import { WaitlistEntry as PrismaWaitlistEntry } from '@prisma/client';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity';

export class WaitlistEntryMapper {
  static toDomain(record: PrismaWaitlistEntry): WaitlistEntry {
    return WaitlistEntry.fromPersistence({
      id: record.id,
      establishmentId: record.establishmentId,
      clientId: record.clientId,
      serviceId: record.serviceId,
      employeeId: record.employeeId,
      desiredDate: record.desiredDate,
      desiredPeriod: record.desiredPeriod,
      status: record.status,
      createdAt: record.createdAt,
    });
  }
}
