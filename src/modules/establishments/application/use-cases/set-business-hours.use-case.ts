import { Injectable } from '@nestjs/common';
import { BusinessHoursRepositoryPort } from '../../domain/business-hours.repository.port';
import { BusinessHoursDay } from '../../domain/entities/business-hours-day.entity';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../domain/errors/establishment-errors';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export interface SetBusinessHoursDayInput {
  weekday: number;
  isClosed: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface SetBusinessHoursInput {
  tenantId: string;
  establishmentId: string;
  days: SetBusinessHoursDayInput[];
}

@Injectable()
export class SetBusinessHoursUseCase {
  constructor(
    private readonly businessHoursRepository: BusinessHoursRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
  ) {}

  async execute(input: SetBusinessHoursInput): Promise<BusinessHoursDay[]> {
    const establishment = await this.establishmentRepository.findById(input.establishmentId, input.tenantId);
    if (!establishment || establishment.deletedAt) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }

    const weekdaysSeen = new Set<number>();
    const days = input.days.map((day) => {
      if (weekdaysSeen.has(day.weekday)) {
        throw new ValidationError(`weekday '${day.weekday}' informado mais de uma vez`);
      }
      weekdaysSeen.add(day.weekday);

      return BusinessHoursDay.create({
        weekday: day.weekday,
        isClosed: day.isClosed,
        openTime: day.openTime ?? null,
        closeTime: day.closeTime ?? null,
      });
    });

    return this.businessHoursRepository.replaceAll(input.establishmentId, days);
  }
}
