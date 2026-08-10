import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import {
  AppointmentAccessDeniedError,
  AppointmentNotFoundError,
  CancellationWindowExpiredError,
} from '../../domain/errors/appointment-errors';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../../establishments/domain/errors/establishment-errors';

export interface CancelAppointmentInput {
  tenantId: string;
  establishmentId: string;
  appointmentId: string;
  reason: string;
  actingUserId: string;
  /** True when the caller has the broad `appointment:update` permission (staff) rather than
   * only `appointment:cancel:own` (client acting on their own appointment). */
  isStaff: boolean;
}

@Injectable()
export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
  ) {}

  async execute(input: CancelAppointmentInput): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
      input.establishmentId,
    );
    if (!appointment) {
      throw new AppointmentNotFoundError(input.appointmentId);
    }

    if (!input.isStaff) {
      if (appointment.clientId !== input.actingUserId) {
        throw new AppointmentAccessDeniedError();
      }
      await this.assertWithinCancellationWindow(input.tenantId, input.establishmentId, appointment);
    }

    const cancelled = appointment.cancel(input.reason, input.actingUserId);
    return this.appointmentRepository.update(cancelled);
  }

  private async assertWithinCancellationWindow(
    tenantId: string,
    establishmentId: string,
    appointment: Appointment,
  ): Promise<void> {
    const establishment = await this.establishmentRepository.findById(establishmentId, tenantId);
    if (!establishment) {
      throw new EstablishmentNotFoundError(establishmentId);
    }

    const hoursUntilAppointment = (appointment.startAt.getTime() - Date.now()) / (60 * 60 * 1000);
    if (hoursUntilAppointment < establishment.cancellationMinHoursNotice) {
      throw new CancellationWindowExpiredError(establishment.cancellationMinHoursNotice);
    }
  }
}
