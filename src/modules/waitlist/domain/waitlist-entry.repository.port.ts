import { WaitlistEntry, WaitlistStatus } from './entities/waitlist-entry.entity';

export interface WaitlistEntryFilters {
  clientId?: string;
  status?: WaitlistStatus;
}

export abstract class WaitlistEntryRepositoryPort {
  abstract create(entry: WaitlistEntry): Promise<WaitlistEntry>;
  abstract update(entry: WaitlistEntry): Promise<WaitlistEntry>;
  abstract findById(id: string, establishmentId: string): Promise<WaitlistEntry | null>;
  abstract findMany(
    establishmentId: string,
    filters: WaitlistEntryFilters,
  ): Promise<WaitlistEntry[]>;

  /** Candidates for a notify-on-cancellation match: `waiting` entries for this service on
   * this exact date, whose `employeeId` is either unset (any employee is fine) or matches
   * the employee who just freed up. Callers still filter by `desiredPeriod` themselves
   * (see waitlist-period.util.ts) since that's a domain concern, not a query concern. */
  abstract findWaitingMatches(
    establishmentId: string,
    serviceId: string,
    employeeId: string,
    desiredDate: Date,
  ): Promise<WaitlistEntry[]>;
}
