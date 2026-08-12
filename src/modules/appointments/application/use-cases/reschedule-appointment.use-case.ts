import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import {
  APPOINTMENT_RESCHEDULED_EVENT,
  AppointmentRescheduledEvent,
} from '../../domain/events/appointment-events';
import { Appointment } from '../../domain/entities/appointment.entity';
import {
  AppointmentAccessDeniedError,
  AppointmentNotFoundError,
  CancellationWindowExpiredError,
  EmployeeNotEligibleForServiceError,
} from '../../domain/errors/appointment-errors';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../../establishments/domain/errors/establishment-errors';
import { ServiceRepositoryPort } from '../../../services/domain/service.repository.port';
import { ServiceNotFoundError } from '../../../services/domain/errors/service-errors';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { EmployeeNotFoundError } from '../../../employees/domain/errors/employee-errors';

export interface RescheduleAppointmentInput {
  tenantId: string;
  establishmentId: string;
  appointmentId: string;
  newStartAt: Date;
  /** Optional — defaults to the appointment's current employee. */
  newEmployeeId?: string;
  actingUserId: string;
  isStaff: boolean;
}

@Injectable()
export class RescheduleAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: RescheduleAppointmentInput): Promise<Appointment> {
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

    // Captured before appointment.reschedule() below moves it, so the notice can say where
    // the appointment used to be.
    const previousStartAt = appointment.startAt;

    const targetEmployeeId = input.newEmployeeId ?? appointment.employeeId;

    const service = await this.serviceRepository.findById(
      appointment.serviceId,
      input.establishmentId,
    );
    if (!service || service.status !== 'active') {
      throw new ServiceNotFoundError(appointment.serviceId);
    }

    if (input.newEmployeeId) {
      const employee = await this.employeeRepository.findById(
        targetEmployeeId,
        input.establishmentId,
      );
      if (!employee || employee.status !== 'active') {
        throw new EmployeeNotFoundError(targetEmployeeId);
      }
      const eligibleEmployeeIds = await this.serviceRepository.findEligibleEmployeeIds(
        appointment.serviceId,
      );
      if (!eligibleEmployeeIds.includes(targetEmployeeId)) {
        throw new EmployeeNotEligibleForServiceError(targetEmployeeId, appointment.serviceId);
      }
    }

    const newEndAt = new Date(input.newStartAt.getTime() + service.durationMinutes * 60_000);
    // Validates the entity's own invariants (non-terminal status, startAt < endAt) before
    // touching the database — the actual conflict re-check happens transactionally below.
    appointment.reschedule(input.newStartAt, newEndAt, targetEmployeeId);

    const date = input.newStartAt.toISOString().slice(0, 10);

    const saved = await this.appointmentRepository.rescheduleIfAvailable({
      appointmentId: appointment.id,
      establishmentId: input.establishmentId,
      employeeId: targetEmployeeId,
      date,
      startAt: input.newStartAt,
      endAt: newEndAt,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
    });

    // Only after the move actually committed — a conflict throws above, and the client must
    // never be told about a reschedule that did not happen.
    const event: AppointmentRescheduledEvent = {
      appointmentId: saved.id,
      establishmentId: saved.establishmentId,
      clientId: saved.clientId,
      employeeId: saved.employeeId,
      serviceId: saved.serviceId,
      startAt: saved.startAt,
      endAt: saved.endAt,
      previousStartAt,
    };
    await this.eventEmitter.emitAsync(APPOINTMENT_RESCHEDULED_EVENT, event);

    return saved;
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
