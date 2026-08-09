import { BusinessHoursDay } from './entities/business-hours-day.entity';

export abstract class BusinessHoursRepositoryPort {
  abstract findAllByEstablishment(establishmentId: string): Promise<BusinessHoursDay[]>;

  /** Replaces the entire week in one transaction — business hours are always edited as a
   * set (there's no meaningful "create one day" operation independent of the others). */
  abstract replaceAll(establishmentId: string, days: BusinessHoursDay[]): Promise<BusinessHoursDay[]>;
}
