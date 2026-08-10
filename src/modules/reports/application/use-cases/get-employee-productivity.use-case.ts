import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { DateRangeInput } from './get-top-services.use-case';

export interface EmployeeMetric {
  employeeId: string;
  count: number;
  revenueCents: number;
}

@Injectable()
export class GetEmployeeProductivityUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepositoryPort) {}

  async execute(input: DateRangeInput): Promise<EmployeeMetric[]> {
    const appointments = await this.appointmentRepository.findMany(input.establishmentId, {
      fromDate: input.fromDate,
      toDate: input.toDate,
    });

    const byEmployee = new Map<string, EmployeeMetric>();
    for (const appointment of appointments) {
      if (appointment.status !== 'completed') {
        continue;
      }
      const existing = byEmployee.get(appointment.employeeId) ?? {
        employeeId: appointment.employeeId,
        count: 0,
        revenueCents: 0,
      };
      existing.count += 1;
      existing.revenueCents += appointment.priceCents;
      byEmployee.set(appointment.employeeId, existing);
    }

    return [...byEmployee.values()].sort((a, b) => b.revenueCents - a.revenueCents);
  }
}
