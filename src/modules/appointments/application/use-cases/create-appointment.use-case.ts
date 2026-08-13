import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ServiceRepositoryPort } from '../../../services/domain/service.repository.port';
import { ServiceNotFoundError } from '../../../services/domain/errors/service-errors';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { EmployeeNotFoundError } from '../../../employees/domain/errors/employee-errors';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import { EmployeeNotEligibleForServiceError } from '../../domain/errors/appointment-errors';
import {
  APPOINTMENT_CREATED_EVENT,
  AppointmentCreatedEvent,
} from '../../domain/events/appointment-events';

export interface CreateAppointmentInput {
  establishmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  startAt: Date;
  /** When true, skips the availability/overlap check entirely (still requires the service
   * and employee to exist and the employee to be eligible for the service). */
  isFitIn?: boolean;
  /** Integration API dedupe key (Fase 24) — see IntegrationsController. */
  idempotencyKey?: string;
  createdById: string;
}

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: CreateAppointmentInput): Promise<Appointment> {
    const service = await this.serviceRepository.findById(input.serviceId, input.establishmentId);
    if (!service || service.status !== 'active') {
      throw new ServiceNotFoundError(input.serviceId);
    }

    const employee = await this.employeeRepository.findById(
      input.employeeId,
      input.establishmentId,
    );
    if (!employee || employee.status !== 'active') {
      throw new EmployeeNotFoundError(input.employeeId);
    }

    const eligibleEmployeeIds = await this.serviceRepository.findEligibleEmployeeIds(
      input.serviceId,
    );
    if (!eligibleEmployeeIds.includes(input.employeeId)) {
      throw new EmployeeNotEligibleForServiceError(input.employeeId, input.serviceId);
    }

    const endAt = new Date(input.startAt.getTime() + service.durationMinutes * 60_000);
    const date = input.startAt.toISOString().slice(0, 10);

    const appointment = await this.appointmentRepository.createIfAvailable({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      clientId: input.clientId,
      employeeId: input.employeeId,
      serviceId: input.serviceId,
      date,
      startAt: input.startAt,
      endAt,
      priceCents: service.priceCents,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      isFitIn: input.isFitIn ?? false,
      idempotencyKey: input.idempotencyKey,
      createdById: input.createdById,
    });

    // emitAsync (not emit) so the listener's DB writes complete before this use case
    // returns — safe to await because NotificationDispatcherService never throws (it
    // catches and records its own failures), so this can never fail the booking itself.
    const event: AppointmentCreatedEvent = {
      appointmentId: appointment.id,
      establishmentId: appointment.establishmentId,
      clientId: appointment.clientId,
      employeeId: appointment.employeeId,
      serviceId: appointment.serviceId,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      priceCents: appointment.priceCents,
    };
    await this.eventEmitter.emitAsync(APPOINTMENT_CREATED_EVENT, event);

    return appointment;
  }
}
