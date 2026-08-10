import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateAppointmentUseCase } from './create-appointment.use-case';
import { ServiceRepositoryPort } from '../../../services/domain/service.repository.port';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Service } from '../../../services/domain/entities/service.entity';
import { Employee } from '../../../employees/domain/entities/employee.entity';
import { Appointment } from '../../domain/entities/appointment.entity';
import { ServiceNotFoundError } from '../../../services/domain/errors/service-errors';
import { EmployeeNotFoundError } from '../../../employees/domain/errors/employee-errors';
import {
  EmployeeNotEligibleForServiceError,
  SlotNotAvailableError,
} from '../../domain/errors/appointment-errors';
import { APPOINTMENT_CREATED_EVENT } from '../../domain/events/appointment-events';

describe('CreateAppointmentUseCase', () => {
  const service = Service.create({
    id: 'service-1',
    establishmentId: 'establishment-1',
    name: 'Corte',
    priceCents: 5000,
    durationMinutes: 30,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 10,
  });

  const employee = Employee.create({
    id: 'employee-1',
    establishmentId: 'establishment-1',
    userId: 'user-1',
    jobTitle: 'Barbeiro',
  });

  const createdAppointment = Appointment.create({
    id: 'appointment-1',
    establishmentId: 'establishment-1',
    clientId: 'client-1',
    employeeId: 'employee-1',
    serviceId: 'service-1',
    startAt: new Date('2026-03-10T10:00:00.000Z'),
    endAt: new Date('2026-03-10T10:30:00.000Z'),
    priceCents: 5000,
    createdById: 'staff-1',
  });

  function build(overrides?: {
    serviceRepository?: Partial<ServiceRepositoryPort>;
    employeeRepository?: Partial<EmployeeRepositoryPort>;
    appointmentRepository?: Partial<AppointmentRepositoryPort>;
  }) {
    const serviceRepository: ServiceRepositoryPort = {
      findById: jest.fn().mockResolvedValue(service),
      findEligibleEmployeeIds: jest.fn().mockResolvedValue(['employee-1']),
      ...overrides?.serviceRepository,
    } as unknown as ServiceRepositoryPort;

    const employeeRepository: EmployeeRepositoryPort = {
      findById: jest.fn().mockResolvedValue(employee),
      ...overrides?.employeeRepository,
    } as unknown as EmployeeRepositoryPort;

    const appointmentRepository: AppointmentRepositoryPort = {
      createIfAvailable: jest.fn().mockResolvedValue(createdAppointment),
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    const eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) } as unknown as EventEmitter2;

    return {
      useCase: new CreateAppointmentUseCase(
        serviceRepository,
        employeeRepository,
        appointmentRepository,
        eventEmitter,
      ),
      appointmentRepository,
      eventEmitter,
    };
  }

  const input = {
    establishmentId: 'establishment-1',
    clientId: 'client-1',
    employeeId: 'employee-1',
    serviceId: 'service-1',
    startAt: new Date('2026-03-10T10:00:00.000Z'),
    createdById: 'staff-1',
  };

  it('computes endAt/date/buffers from the service and delegates to the repository', async () => {
    const { useCase, appointmentRepository } = build();

    await useCase.execute(input);

    expect(appointmentRepository.createIfAvailable).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-03-10',
        startAt: input.startAt,
        endAt: new Date('2026-03-10T10:30:00.000Z'),
        priceCents: 5000,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 10,
        isFitIn: false,
      }),
    );
  });

  it('emits appointment.created with the new appointment data', async () => {
    const { useCase, eventEmitter } = build();

    await useCase.execute(input);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      APPOINTMENT_CREATED_EVENT,
      expect.objectContaining({ appointmentId: 'appointment-1', clientId: 'client-1' }),
    );
  });

  it('passes isFitIn through to the repository when set', async () => {
    const { useCase, appointmentRepository } = build();

    await useCase.execute({ ...input, isFitIn: true });

    expect(appointmentRepository.createIfAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ isFitIn: true }),
    );
  });

  it('throws ServiceNotFoundError when the service is missing or inactive', async () => {
    const { useCase } = build({
      serviceRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(input)).rejects.toThrow(ServiceNotFoundError);

    const inactiveService = service.deactivate();
    const { useCase: useCase2 } = build({
      serviceRepository: { findById: jest.fn().mockResolvedValue(inactiveService) },
    });
    await expect(useCase2.execute(input)).rejects.toThrow(ServiceNotFoundError);
  });

  it('throws EmployeeNotFoundError when the employee is missing or inactive', async () => {
    const { useCase } = build({
      employeeRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(input)).rejects.toThrow(EmployeeNotFoundError);
  });

  it('throws EmployeeNotEligibleForServiceError when the employee cannot perform the service', async () => {
    const { useCase, appointmentRepository } = build({
      serviceRepository: {
        findEligibleEmployeeIds: jest.fn().mockResolvedValue(['some-other-employee']),
      },
    });

    await expect(useCase.execute(input)).rejects.toThrow(EmployeeNotEligibleForServiceError);
    expect(appointmentRepository.createIfAvailable).not.toHaveBeenCalled();
  });

  it('propagates SlotNotAvailableError from the repository', async () => {
    const { useCase } = build({
      appointmentRepository: {
        createIfAvailable: jest.fn().mockRejectedValue(new SlotNotAvailableError()),
      },
    });

    await expect(useCase.execute(input)).rejects.toThrow(SlotNotAvailableError);
  });
});
