import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { DateRangeInput } from './get-top-services.use-case';

export interface HourMetric {
  /** UTC hour of day (0-23) — same "naive" timezone simplification used elsewhere. */
  hour: number;
  count: number;
}

@Injectable()
export class GetPeakHoursUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepositoryPort) {}

  async execute(input: DateRangeInput): Promise<HourMetric[]> {
    const appointments = await this.appointmentRepository.findMany(input.establishmentId, {
      fromDate: input.fromDate,
      toDate: input.toDate,
    });

    const counts = new Array<number>(24).fill(0);
    for (const appointment of appointments) {
      if (appointment.status !== 'completed') {
        continue;
      }
      counts[appointment.startAt.getUTCHours()] += 1;
    }

    return counts.map((count, hour) => ({ hour, count })).filter((metric) => metric.count > 0);
  }
}
