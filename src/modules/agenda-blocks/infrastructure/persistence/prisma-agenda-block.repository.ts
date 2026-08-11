import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { AgendaBlock } from '../../domain/entities/agenda-block.entity';
import { AgendaBlockFilters, AgendaBlockRepositoryPort } from '../../domain/agenda-block.repository.port';
import { AgendaBlockMapper } from './agenda-block.mapper';

@Injectable()
export class PrismaAgendaBlockRepository implements AgendaBlockRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(block: AgendaBlock): Promise<AgendaBlock> {
    const props = block.toPersistenceProps();
    const created = await this.prisma.agendaBlock.create({
      data: {
        id: props.id,
        establishmentId: props.establishmentId,
        employeeId: props.employeeId,
        startAt: props.startAt,
        endAt: props.endAt,
        reason: props.reason,
        createdById: props.createdById,
      },
    });
    return AgendaBlockMapper.toDomain(created);
  }

  async findById(id: string, establishmentId: string): Promise<AgendaBlock | null> {
    const found = await this.prisma.agendaBlock.findFirst({ where: { id, establishmentId } });
    return found ? AgendaBlockMapper.toDomain(found) : null;
  }

  async findMany(establishmentId: string, filters: AgendaBlockFilters): Promise<AgendaBlock[]> {
    const records = await this.prisma.agendaBlock.findMany({
      where: {
        establishmentId,
        employeeId: filters.employeeId,
        ...(filters.fromDate || filters.toDate
          ? {
              startAt: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { startAt: 'asc' },
    });
    return records.map(AgendaBlockMapper.toDomain);
  }

  async delete(id: string, establishmentId: string): Promise<void> {
    await this.prisma.agendaBlock.deleteMany({ where: { id, establishmentId } });
  }
}
