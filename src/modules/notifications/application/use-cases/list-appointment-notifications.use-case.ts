import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { AppointmentNotFoundError } from '../../../appointments/domain/errors/appointment-errors';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';

export interface ListAppointmentNotificationsInput {
  establishmentId: string;
  appointmentId: string;
}

@Injectable()
export class ListAppointmentNotificationsUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly notificationRepository: NotificationRepositoryPort,
  ) {}

  async execute(input: ListAppointmentNotificationsInput): Promise<Notification[]> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
      input.establishmentId,
    );
    if (!appointment) {
      throw new AppointmentNotFoundError(input.appointmentId);
    }

    return this.notificationRepository.findByAppointment(input.appointmentId);
  }
}
