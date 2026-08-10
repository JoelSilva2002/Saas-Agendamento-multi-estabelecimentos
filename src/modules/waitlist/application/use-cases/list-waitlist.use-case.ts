import { Injectable } from '@nestjs/common';
import {
  WaitlistEntryFilters,
  WaitlistEntryRepositoryPort,
} from '../../domain/waitlist-entry.repository.port';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity';

export interface ListWaitlistInput {
  establishmentId: string;
  actingUserId: string;
  isStaff: boolean;
  filters: WaitlistEntryFilters;
}

@Injectable()
export class ListWaitlistUseCase {
  constructor(private readonly waitlistEntryRepository: WaitlistEntryRepositoryPort) {}

  async execute(input: ListWaitlistInput): Promise<WaitlistEntry[]> {
    const filters: WaitlistEntryFilters = input.isStaff
      ? input.filters
      : { ...input.filters, clientId: input.actingUserId };
    return this.waitlistEntryRepository.findMany(input.establishmentId, filters);
  }
}
