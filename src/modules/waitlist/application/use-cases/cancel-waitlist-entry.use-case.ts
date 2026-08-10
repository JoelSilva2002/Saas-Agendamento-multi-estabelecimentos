import { Injectable } from '@nestjs/common';
import { WaitlistEntryRepositoryPort } from '../../domain/waitlist-entry.repository.port';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity';
import {
  WaitlistEntryAccessDeniedError,
  WaitlistEntryNotFoundError,
} from '../../domain/errors/waitlist-errors';

export interface CancelWaitlistEntryInput {
  establishmentId: string;
  entryId: string;
  actingUserId: string;
  isStaff: boolean;
}

@Injectable()
export class CancelWaitlistEntryUseCase {
  constructor(private readonly waitlistEntryRepository: WaitlistEntryRepositoryPort) {}

  async execute(input: CancelWaitlistEntryInput): Promise<WaitlistEntry> {
    const entry = await this.waitlistEntryRepository.findById(input.entryId, input.establishmentId);
    if (!entry) {
      throw new WaitlistEntryNotFoundError(input.entryId);
    }
    if (!input.isStaff && entry.clientId !== input.actingUserId) {
      throw new WaitlistEntryAccessDeniedError();
    }

    return this.waitlistEntryRepository.update(entry.cancel());
  }
}
