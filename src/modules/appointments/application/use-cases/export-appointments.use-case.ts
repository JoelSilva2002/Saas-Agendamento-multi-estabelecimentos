import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';

export interface ExportAppointmentsInput {
  establishmentId: string;
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class ExportAppointmentsUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepositoryPort) {}

  async execute(input: ExportAppointmentsInput): Promise<Appointment[]> {
    return this.appointmentRepository.findMany(input.establishmentId, {
      fromDate: input.fromDate,
      toDate: input.toDate,
    });
  }
}
