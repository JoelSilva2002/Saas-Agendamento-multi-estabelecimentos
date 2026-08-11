import { AgendaBlock as PrismaAgendaBlock } from '@prisma/client';
import { AgendaBlock } from '../../domain/entities/agenda-block.entity';

export class AgendaBlockMapper {
  static toDomain(record: PrismaAgendaBlock): AgendaBlock {
    return AgendaBlock.fromPersistence({
      id: record.id,
      establishmentId: record.establishmentId,
      employeeId: record.employeeId,
      startAt: record.startAt,
      endAt: record.endAt,
      reason: record.reason,
      createdById: record.createdById,
      createdAt: record.createdAt,
    });
  }
}
