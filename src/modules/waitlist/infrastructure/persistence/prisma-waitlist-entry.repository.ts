import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity';
import {
  WaitlistEntryFilters,
  WaitlistEntryRepositoryPort,
} from '../../domain/waitlist-entry.repository.port';
import { WaitlistEntryMapper } from './waitlist-entry.mapper';

function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

@Injectable()
export class PrismaWaitlistEntryRepository implements WaitlistEntryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: WaitlistEntry): Promise<WaitlistEntry> {
    const props = entry.toPersistenceProps();
    const created = await this.prisma.waitlistEntry.create({
      data: {
        id: props.id,
        establishmentId: props.establishmentId,
        clientId: props.clientId,
        serviceId: props.serviceId,
        employeeId: props.employeeId,
        desiredDate: toDateOnly(props.desiredDate),
        desiredPeriod: props.desiredPeriod,
        status: props.status,
      },
    });
    return WaitlistEntryMapper.toDomain(created);
  }

  async update(entry: WaitlistEntry): Promise<WaitlistEntry> {
    const props = entry.toPersistenceProps();
    const updated = await this.prisma.waitlistEntry.update({
      where: { id: props.id },
      data: { status: props.status },
    });
    return WaitlistEntryMapper.toDomain(updated);
  }

  async findById(id: string, establishmentId: string): Promise<WaitlistEntry | null> {
    const found = await this.prisma.waitlistEntry.findFirst({ where: { id, establishmentId } });
    return found ? WaitlistEntryMapper.toDomain(found) : null;
  }

  async findMany(establishmentId: string, filters: WaitlistEntryFilters): Promise<WaitlistEntry[]> {
    const records = await this.prisma.waitlistEntry.findMany({
      where: { establishmentId, clientId: filters.clientId, status: filters.status },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(WaitlistEntryMapper.toDomain);
  }

  async findWaitingMatches(
    establishmentId: string,
    serviceId: string,
    employeeId: string,
    desiredDate: Date,
  ): Promise<WaitlistEntry[]> {
    const records = await this.prisma.waitlistEntry.findMany({
      where: {
        establishmentId,
        serviceId,
        status: 'waiting',
        desiredDate: toDateOnly(desiredDate),
        OR: [{ employeeId: null }, { employeeId }],
      },
    });
    return records.map(WaitlistEntryMapper.toDomain);
  }
}
