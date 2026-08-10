import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { WaitlistEntryRepositoryPort } from '../../domain/waitlist-entry.repository.port';
import { WaitlistEntry, WaitlistPeriod } from '../../domain/entities/waitlist-entry.entity';

export interface JoinWaitlistInput {
  establishmentId: string;
  clientId: string;
  serviceId: string;
  employeeId?: string;
  desiredDate: Date;
  desiredPeriod?: WaitlistPeriod;
}

@Injectable()
export class JoinWaitlistUseCase {
  constructor(private readonly waitlistEntryRepository: WaitlistEntryRepositoryPort) {}

  async execute(input: JoinWaitlistInput): Promise<WaitlistEntry> {
    const entry = WaitlistEntry.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      clientId: input.clientId,
      serviceId: input.serviceId,
      employeeId: input.employeeId,
      desiredDate: input.desiredDate,
      desiredPeriod: input.desiredPeriod,
    });
    return this.waitlistEntryRepository.create(entry);
  }
}
