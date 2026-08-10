import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';

export interface DateRangeInput {
  establishmentId: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface ServiceMetric {
  serviceId: string;
  count: number;
  revenueCents: number;
}

@Injectable()
export class GetTopServicesUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepositoryPort) {}

  async execute(input: DateRangeInput): Promise<ServiceMetric[]> {
    const appointments = await this.appointmentRepository.findMany(input.establishmentId, {
      fromDate: input.fromDate,
      toDate: input.toDate,
    });

    const byService = new Map<string, ServiceMetric>();
    for (const appointment of appointments) {
      if (appointment.status !== 'completed') {
        continue;
      }
      const existing = byService.get(appointment.serviceId) ?? {
        serviceId: appointment.serviceId,
        count: 0,
        revenueCents: 0,
      };
      existing.count += 1;
      existing.revenueCents += appointment.priceCents;
      byService.set(appointment.serviceId, existing);
    }

    return [...byService.values()].sort((a, b) => b.revenueCents - a.revenueCents);
  }
}
