import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-errors';

export interface CompleteAppointmentInput {
  establishmentId: string;
  appointmentId: string;
}

@Injectable()
export class CompleteAppointmentUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepositoryPort) {}

  async execute(input: CompleteAppointmentInput): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
      input.establishmentId,
    );
    if (!appointment) {
      throw new AppointmentNotFoundError(input.appointmentId);
    }

    return this.appointmentRepository.update(appointment.complete());
  }
}
