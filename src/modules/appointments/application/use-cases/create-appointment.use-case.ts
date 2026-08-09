import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ServiceRepositoryPort } from '../../../services/domain/service.repository.port';
import { ServiceNotFoundError } from '../../../services/domain/errors/service-errors';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { EmployeeNotFoundError } from '../../../employees/domain/errors/employee-errors';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import { EmployeeNotEligibleForServiceError } from '../../domain/errors/appointment-errors';

export interface CreateAppointmentInput {
  establishmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  startAt: Date;
  /** When true, skips the availability/overlap check entirely (still requires the service
   * and employee to exist and the employee to be eligible for the service). */
  isFitIn?: boolean;
  createdById: string;
}

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly appointmentRepository: AppointmentRepositoryPort,
  ) {}

  async execute(input: CreateAppointmentInput): Promise<Appointment> {
    const service = await this.serviceRepository.findById(input.serviceId, input.establishmentId);
    if (!service || service.status !== 'active') {
      throw new ServiceNotFoundError(input.serviceId);
    }

    const employee = await this.employeeRepository.findById(input.employeeId, input.establishmentId);
    if (!employee || employee.status !== 'active') {
      throw new EmployeeNotFoundError(input.employeeId);
    }

    const eligibleEmployeeIds = await this.serviceRepository.findEligibleEmployeeIds(input.serviceId);
    if (!eligibleEmployeeIds.includes(input.employeeId)) {
      throw new EmployeeNotEligibleForServiceError(input.employeeId, input.serviceId);
    }

    const endAt = new Date(input.startAt.getTime() + service.durationMinutes * 60_000);
    const date = input.startAt.toISOString().slice(0, 10);

    return this.appointmentRepository.createIfAvailable({
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
      createdById: input.createdById,
    });
  }
}
