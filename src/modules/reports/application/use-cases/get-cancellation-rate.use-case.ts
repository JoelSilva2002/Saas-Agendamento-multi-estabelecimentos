import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { DateRangeInput } from './get-top-services.use-case';

export interface CancellationRate {
  total: number;
  cancelled: number;
  noShow: number;
  completed: number;
  /** Cancelled ÷ total, 0–1. */
  cancellationRate: number;
  /** No-shows ÷ total, 0–1. Reported separately: a client who warns beforehand and one who
   * simply does not turn up are different problems with different responses. */
  noShowRate: number;
}

/** "Taxa de cancelamento" (§11), over every appointment in the range regardless of status —
 * the denominator has to include the ones that went fine, or the rate is meaningless. */
@Injectable()
export class GetCancellationRateUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepositoryPort) {}

  async execute(input: DateRangeInput): Promise<CancellationRate> {
    const appointments = await this.appointmentRepository.findMany(input.establishmentId, {
      fromDate: input.fromDate,
      toDate: input.toDate,
    });

    const total = appointments.length;
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
    const noShow = appointments.filter((a) => a.status === 'no_show').length;
    const completed = appointments.filter((a) => a.status === 'completed').length;

    return {
      total,
      cancelled,
      noShow,
      completed,
      cancellationRate: total > 0 ? cancelled / total : 0,
      noShowRate: total > 0 ? noShow / total : 0,
    };
  }
}
