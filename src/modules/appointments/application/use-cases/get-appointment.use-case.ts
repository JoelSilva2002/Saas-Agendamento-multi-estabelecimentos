import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import {
  AppointmentAccessDeniedError,
  AppointmentNotFoundError,
} from '../../domain/errors/appointment-errors';

export interface GetAppointmentInput {
  establishmentId: string;
  appointmentId: string;
  actingUserId: string;
  isStaff: boolean;
}

@Injectable()
export class GetAppointmentUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepositoryPort) {}

  async execute(input: GetAppointmentInput): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
      input.establishmentId,
    );
    if (!appointment) {
      throw new AppointmentNotFoundError(input.appointmentId);
    }

    if (!input.isStaff && appointment.clientId !== input.actingUserId) {
      throw new AppointmentAccessDeniedError();
    }

    return appointment;
  }
}
