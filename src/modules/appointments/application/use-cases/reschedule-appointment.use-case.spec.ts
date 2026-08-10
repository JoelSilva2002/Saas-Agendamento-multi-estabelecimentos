import { RescheduleAppointmentUseCase } from './reschedule-appointment.use-case';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { ServiceRepositoryPort } from '../../../services/domain/service.repository.port';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import { Establishment } from '../../../establishments/domain/entities/establishment.entity';
import { Service } from '../../../services/domain/entities/service.entity';
import { Employee } from '../../../employees/domain/entities/employee.entity';
import {
  AppointmentAccessDeniedError,
  CancellationWindowExpiredError,
  EmployeeNotEligibleForServiceError,
  SlotNotAvailableError,
} from '../../domain/errors/appointment-errors';
import { EmployeeNotFoundError } from '../../../employees/domain/errors/employee-errors';

describe('RescheduleAppointmentUseCase', () => {
  const NOW = new Date('2026-03-10T00:00:00.000Z');

  function buildAppointment(startAt: Date, clientId = 'client-1'): Appointment {
    return Appointment.create({
      id: 'appointment-1',
      establishmentId: 'establishment-1',
      clientId,
      employeeId: 'employee-1',
      serviceId: 'service-1',
      startAt,
      endAt: new Date(startAt.getTime() + 30 * 60_000),
      priceCents: 5000,
      createdById: 'staff-1',
    });
  }

  const service = Service.create({
    id: 'service-1',
    establishmentId: 'establishment-1',
    name: 'Corte',
    priceCents: 5000,
    durationMinutes: 30,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
  });

  const employee2 = Employee.create({
    id: 'employee-2',
    establishmentId: 'establishment-1',
    userId: 'user-2',
    jobTitle: 'Barbeiro',
  });

  function build(overrides?: {
    appointmentRepository?: Partial<AppointmentRepositoryPort>;
    establishmentRepository?: Partial<EstablishmentRepositoryPort>;
    serviceRepository?: Partial<ServiceRepositoryPort>;
    employeeRepository?: Partial<EmployeeRepositoryPort>;
  }) {
    const appointmentRepository: AppointmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(buildAppointment(new Date('2026-03-15T10:00:00.000Z'))),
      rescheduleIfAvailable: jest
        .fn()
        .mockResolvedValue(buildAppointment(new Date('2026-03-16T10:00:00.000Z'))),
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    const establishmentRepository: EstablishmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(
        Establishment.create({
          id: 'establishment-1',
          tenantId: 'tenant-1',
          name: 'Filial',
          slug: 'filial',
        }),
      ),
      ...overrides?.establishmentRepository,
    } as unknown as EstablishmentRepositoryPort;

    const serviceRepository: ServiceRepositoryPort = {
      findById: jest.fn().mockResolvedValue(service),
      findEligibleEmployeeIds: jest.fn().mockResolvedValue(['employee-1', 'employee-2']),
      ...overrides?.serviceRepository,
    } as unknown as ServiceRepositoryPort;

    const employeeRepository: EmployeeRepositoryPort = {
      findById: jest.fn().mockResolvedValue(employee2),
      ...overrides?.employeeRepository,
    } as unknown as EmployeeRepositoryPort;

    return {
      useCase: new RescheduleAppointmentUseCase(
        appointmentRepository,
        establishmentRepository,
        serviceRepository,
        employeeRepository,
      ),
      appointmentRepository,
      employeeRepository,
      serviceRepository,
    };
  }

  const baseInput = {
    tenantId: 'tenant-1',
    establishmentId: 'establishment-1',
    appointmentId: 'appointment-1',
    newStartAt: new Date('2026-03-16T10:00:00.000Z'),
    actingUserId: 'client-1',
    isStaff: false,
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reschedules to a new time keeping the same employee', async () => {
    const { useCase, appointmentRepository } = build();
    await useCase.execute(baseInput);

    expect(appointmentRepository.rescheduleIfAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: 'appointment-1', employeeId: 'employee-1' }),
    );
  });

  it('re-validates eligibility when moving to a different employee', async () => {
    const { useCase, appointmentRepository } = build();
    await useCase.execute({ ...baseInput, newEmployeeId: 'employee-2' });

    expect(appointmentRepository.rescheduleIfAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'employee-2' }),
    );
  });

  it('throws EmployeeNotEligibleForServiceError when the target employee cannot perform the service', async () => {
    const { useCase } = build({
      serviceRepository: { findEligibleEmployeeIds: jest.fn().mockResolvedValue(['employee-1']) },
    });
    await expect(useCase.execute({ ...baseInput, newEmployeeId: 'employee-2' })).rejects.toThrow(
      EmployeeNotEligibleForServiceError,
    );
  });

  it('throws EmployeeNotFoundError when the target employee does not exist', async () => {
    const { useCase } = build({
      employeeRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute({ ...baseInput, newEmployeeId: 'employee-2' })).rejects.toThrow(
      EmployeeNotFoundError,
    );
  });

  it("throws AppointmentAccessDeniedError for a client rescheduling someone else's appointment", async () => {
    const { useCase } = build({
      appointmentRepository: {
        findById: jest
          .fn()
          .mockResolvedValue(
            buildAppointment(new Date('2026-03-15T10:00:00.000Z'), 'other-client'),
          ),
      },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(AppointmentAccessDeniedError);
  });

  it('throws CancellationWindowExpiredError when a client reschedules with too little notice', async () => {
    const { useCase } = build({
      appointmentRepository: {
        findById: jest
          .fn()
          .mockResolvedValue(buildAppointment(new Date('2026-03-10T10:00:00.000Z'))),
      },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(CancellationWindowExpiredError);
  });

  it('lets staff reschedule regardless of the notice window', async () => {
    const { useCase, appointmentRepository } = build({
      appointmentRepository: {
        findById: jest
          .fn()
          .mockResolvedValue(buildAppointment(new Date('2026-03-10T10:00:00.000Z'))),
      },
    });
    await useCase.execute({ ...baseInput, actingUserId: 'staff-1', isStaff: true });
    expect(appointmentRepository.rescheduleIfAvailable).toHaveBeenCalled();
  });

  it('propagates SlotNotAvailableError from the repository', async () => {
    const { useCase } = build({
      appointmentRepository: {
        rescheduleIfAvailable: jest.fn().mockRejectedValue(new SlotNotAvailableError()),
      },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(SlotNotAvailableError);
  });
});
