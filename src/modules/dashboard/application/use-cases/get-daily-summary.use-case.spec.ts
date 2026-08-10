import { GetDailySummaryUseCase } from './get-daily-summary.use-case';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { PaymentRepositoryPort } from '../../../payments/domain/payment.repository.port';
import { ClientProfileRepositoryPort } from '../../../clients/domain/client-profile.repository.port';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { EmployeeScheduleRepositoryPort } from '../../../employees/domain/employee-schedule.repository.port';
import { EmployeeTimeOffRepositoryPort } from '../../../employees/domain/employee-time-off.repository.port';
import { BusinessHoursRepositoryPort } from '../../../establishments/domain/business-hours.repository.port';
import { Appointment } from '../../../appointments/domain/entities/appointment.entity';
import { Employee } from '../../../employees/domain/entities/employee.entity';
import { BusinessHoursDay } from '../../../establishments/domain/entities/business-hours-day.entity';
import { EmployeeScheduleSlot } from '../../../employees/domain/entities/employee-schedule-slot.entity';

describe('GetDailySummaryUseCase', () => {
  const DATE = '2026-03-10';
  const WEEKDAY = new Date(`${DATE}T00:00:00.000Z`).getUTCDay();

  function buildAppointment(
    status: Appointment['status'],
    startAt = new Date(`${DATE}T10:00:00.000Z`),
  ): Appointment {
    const appointment = Appointment.create({
      id: `appointment-${Math.random()}`,
      establishmentId: 'establishment-1',
      clientId: 'client-1',
      employeeId: 'employee-1',
      serviceId: 'service-1',
      startAt,
      endAt: new Date(startAt.getTime() + 30 * 60_000),
      priceCents: 5000,
      createdById: 'staff-1',
    });
    if (status === 'cancelled') return appointment.cancel('motivo', 'staff-1');
    return appointment;
  }

  const employee = Employee.create({
    id: 'employee-1',
    establishmentId: 'establishment-1',
    userId: 'user-1',
    jobTitle: 'Barbeiro',
  });

  function build(overrides?: {
    appointmentRepository?: Partial<AppointmentRepositoryPort>;
    paymentRepository?: Partial<PaymentRepositoryPort>;
    clientProfileRepository?: Partial<ClientProfileRepositoryPort>;
    employeeRepository?: Partial<EmployeeRepositoryPort>;
    employeeScheduleRepository?: Partial<EmployeeScheduleRepositoryPort>;
    employeeTimeOffRepository?: Partial<EmployeeTimeOffRepositoryPort>;
    businessHoursRepository?: Partial<BusinessHoursRepositoryPort>;
  }) {
    const appointmentRepository: AppointmentRepositoryPort = {
      findMany: jest.fn().mockResolvedValue([]),
      findBusyRangesForEmployeeOnDate: jest.fn().mockResolvedValue([]),
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    const paymentRepository: PaymentRepositoryPort = {
      sumPaidAmountBetween: jest.fn().mockResolvedValue(0),
      ...overrides?.paymentRepository,
    } as unknown as PaymentRepositoryPort;

    const clientProfileRepository: ClientProfileRepositoryPort = {
      countCreatedBetween: jest.fn().mockResolvedValue(0),
      ...overrides?.clientProfileRepository,
    } as unknown as ClientProfileRepositoryPort;

    const employeeRepository: EmployeeRepositoryPort = {
      findAllByEstablishment: jest.fn().mockResolvedValue([employee]),
      ...overrides?.employeeRepository,
    } as unknown as EmployeeRepositoryPort;

    const employeeScheduleRepository: EmployeeScheduleRepositoryPort = {
      findAllByEmployee: jest.fn().mockResolvedValue([
        EmployeeScheduleSlot.create({
          weekday: WEEKDAY,
          slotType: 'working',
          startTime: '09:00',
          endTime: '12:00',
        }),
      ]),
      ...overrides?.employeeScheduleRepository,
    } as unknown as EmployeeScheduleRepositoryPort;

    const employeeTimeOffRepository: EmployeeTimeOffRepositoryPort = {
      findAllByEmployee: jest.fn().mockResolvedValue([]),
      ...overrides?.employeeTimeOffRepository,
    } as unknown as EmployeeTimeOffRepositoryPort;

    const businessHoursRepository: BusinessHoursRepositoryPort = {
      findAllByEstablishment: jest.fn().mockResolvedValue([
        BusinessHoursDay.create({
          weekday: WEEKDAY,
          isClosed: false,
          openTime: '09:00',
          closeTime: '18:00',
        }),
      ]),
      ...overrides?.businessHoursRepository,
    } as unknown as BusinessHoursRepositoryPort;

    return {
      useCase: new GetDailySummaryUseCase(
        appointmentRepository,
        paymentRepository,
        clientProfileRepository,
        employeeRepository,
        employeeScheduleRepository,
        employeeTimeOffRepository,
        businessHoursRepository,
      ),
    };
  }

  it('aggregates appointment counts by status', async () => {
    const { useCase } = build({
      appointmentRepository: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            buildAppointment('pending'),
            buildAppointment('pending'),
            buildAppointment('cancelled'),
          ]),
        findBusyRangesForEmployeeOnDate: jest.fn().mockResolvedValue([]),
      },
    });

    const summary = await useCase.execute('establishment-1', DATE);

    expect(summary.appointments.total).toBe(3);
    expect(summary.appointments.byStatus.pending).toBe(2);
    expect(summary.appointments.byStatus.cancelled).toBe(1);
  });

  it('computes the cancellation rate', async () => {
    const { useCase } = build({
      appointmentRepository: {
        findMany: jest
          .fn()
          .mockResolvedValue([buildAppointment('pending'), buildAppointment('cancelled')]),
        findBusyRangesForEmployeeOnDate: jest.fn().mockResolvedValue([]),
      },
    });

    const summary = await useCase.execute('establishment-1', DATE);
    expect(summary.cancellationRate).toBe(0.5);
  });

  it('reports zero cancellation rate when there are no appointments', async () => {
    const { useCase } = build();
    const summary = await useCase.execute('establishment-1', DATE);
    expect(summary.cancellationRate).toBe(0);
  });

  it('passes through revenue and new client counts', async () => {
    const { useCase } = build({
      paymentRepository: { sumPaidAmountBetween: jest.fn().mockResolvedValue(15000) },
      clientProfileRepository: { countCreatedBetween: jest.fn().mockResolvedValue(4) },
    });

    const summary = await useCase.execute('establishment-1', DATE);
    expect(summary.revenueCents).toBe(15000);
    expect(summary.newClients).toBe(4);
  });

  it('counts vacant slots using a neutral 30-minute duration across active employees', async () => {
    const { useCase } = build();
    // Working 09:00-12:00, 30-minute neutral slots, no bookings -> 6 slots for 1 employee.
    const summary = await useCase.execute('establishment-1', DATE);
    expect(summary.vacantSlots).toBe(6);
  });

  it('excludes inactive employees from the vacant-slot count', async () => {
    const inactiveEmployee = employee.deactivate();
    const { useCase } = build({
      employeeRepository: {
        findAllByEstablishment: jest.fn().mockResolvedValue([inactiveEmployee]),
      },
    });

    const summary = await useCase.execute('establishment-1', DATE);
    expect(summary.vacantSlots).toBe(0);
  });
});
