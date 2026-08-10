import { Injectable } from '@nestjs/common';
import {
  AppointmentRepositoryPort,
  ListAppointmentsFilters,
} from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';

export interface ListAppointmentsInput {
  establishmentId: string;
  actingUserId: string;
  isStaff: boolean;
  filters: ListAppointmentsFilters;
}

@Injectable()
export class ListAppointmentsUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepositoryPort) {}

  async execute(input: ListAppointmentsInput): Promise<Appointment[]> {
    // Non-staff callers can only ever see their own appointments — any clientId they pass
    // in filters is overridden, never merely validated, so there's no way to leak someone
    // else's schedule via a crafted query param.
    const filters: ListAppointmentsFilters = input.isStaff
      ? input.filters
      : { ...input.filters, clientId: input.actingUserId };

    return this.appointmentRepository.findMany(input.establishmentId, filters);
  }
}
