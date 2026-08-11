import { GetAvailableSlotsUseCase } from './get-available-slots.use-case';
import { ServiceRepositoryPort } from '../../../services/domain/service.repository.port';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { BusinessHoursRepositoryPort } from '../../../establishments/domain/business-hours.repository.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { EmployeeScheduleRepositoryPort } from '../../../employees/domain/employee-schedule.repository.port';
import { EmployeeTimeOffRepositoryPort } from '../../../employees/domain/employee-time-off.repository.port';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Service } from '../../../services/domain/entities/service.entity';
import { Employee } from '../../../employees/domain/entities/employee.entity';
import { BusinessHoursDay } from '../../../establishments/domain/entities/business-hours-day.entity';
import { EmployeeScheduleSlot } from '../../../employees/domain/entities/employee-schedule-slot.entity';
import { EmployeeNotEligibleForServiceError } from '../../domain/errors/appointment-errors';

describe('GetAvailableSlotsUseCase', () => {
  const DATE = '2026-03-10';
  const WEEKDAY = new Date(`${DATE}T00:00:00.000Z`).getUTCDay();

  const service = Service.create({
    id: 'service-1',
    establishmentId: 'establishment-1',
    name: 'Corte',
    priceCents: 5000,
    durationMinutes: 30,
  });

  const employee = Employee.create({
    id: 'employee-1',
    establishmentId: 'establishment-1',
    userId: 'user-1',
    jobTitle: 'Barbeiro',
  });

  function build(overrides?: {
    businessHoursRepository?: Partial<BusinessHoursRepositoryPort>;
    scheduleRepository?: Partial<EmployeeScheduleRepositoryPort>;
    timeOffRepository?: Partial<EmployeeTimeOffRepositoryPort>;
    appointmentRepository?: Partial<AppointmentRepositoryPort>;
    serviceRepository?: Partial<ServiceRepositoryPort>;
  }) {
    const serviceRepository: ServiceRepositoryPort = {
      findById: jest.fn().mockResolvedValue(service),
      findEligibleEmployeeIds: jest.fn().mockResolvedValue(['employee-1']),
      ...overrides?.serviceRepository,
    } as unknown as ServiceRepositoryPort;

    const employeeRepository: EmployeeRepositoryPort = {
      findById: jest.fn().mockResolvedValue(employee),
    } as unknown as EmployeeRepositoryPort;

    const businessHoursRepository: BusinessHoursRepositoryPort = {
      findAllByEstablishment: jest.fn().mockResolvedValue([
        BusinessHoursDay.create({ weekday: WEEKDAY, isClosed: false, openTime: '09:00', closeTime: '18:00' }),
      ]),
      ...overrides?.businessHoursRepository,
    } as unknown as BusinessHoursRepositoryPort;

    const scheduleRepository: EmployeeScheduleRepositoryPort = {
      findAllByEmployee: jest.fn().mockResolvedValue([
        EmployeeScheduleSlot.create({ weekday: WEEKDAY, slotType: 'working', startTime: '09:00', endTime: '18:00' }),
      ]),
      ...overrides?.scheduleRepository,
    } as unknown as EmployeeScheduleRepositoryPort;

    const timeOffRepository: EmployeeTimeOffRepositoryPort = {
      findAllByEmployee: jest.fn().mockResolvedValue([]),
      ...overrides?.timeOffRepository,
    } as unknown as EmployeeTimeOffRepositoryPort;

    const appointmentRepository: AppointmentRepositoryPort = {
      findBusyRangesForEmployeeOnDate: jest.fn().mockResolvedValue([]),
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    // UTC so the wall-clock fixtures below map 1:1 onto the expected instants.
    const establishmentRepository = {
      getTimeZone: jest.fn().mockResolvedValue('UTC'),
    } as unknown as EstablishmentRepositoryPort;

    return {
      useCase: new GetAvailableSlotsUseCase(
        serviceRepository,
        employeeRepository,
        businessHoursRepository,
        scheduleRepository,
        timeOffRepository,
        appointmentRepository,
        establishmentRepository,
      ),
    };
  }

  const input = { establishmentId: 'establishment-1', serviceId: 'service-1', employeeId: 'employee-1', date: DATE };

  it('returns slots spanning the full open window when nothing else is booked', async () => {
    const { useCase } = build();

    const slots = await useCase.execute(input);

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].startAt).toEqual(new Date(`${DATE}T09:00:00.000Z`));
    expect(slots[slots.length - 1].endAt <= new Date(`${DATE}T18:00:00.000Z`)).toBe(true);
  });

  it('excludes a busy range returned by the appointment repository', async () => {
    const { useCase } = build({
      appointmentRepository: {
        findBusyRangesForEmployeeOnDate: jest.fn().mockResolvedValue([
          {
            startAt: new Date(`${DATE}T10:00:00.000Z`),
            endAt: new Date(`${DATE}T10:30:00.000Z`),
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: 0,
          },
        ]),
      },
    });

    const slots = await useCase.execute(input);
    const overlapsBusy = slots.some(
      (s) => s.startAt < new Date(`${DATE}T10:30:00.000Z`) && s.endAt > new Date(`${DATE}T10:00:00.000Z`),
    );
    expect(overlapsBusy).toBe(false);
  });

  it('throws EmployeeNotEligibleForServiceError when the employee cannot perform the service', async () => {
    const { useCase } = build({ serviceRepository: { findEligibleEmployeeIds: jest.fn().mockResolvedValue([]) } });

    await expect(useCase.execute(input)).rejects.toThrow(EmployeeNotEligibleForServiceError);
  });

  it('returns no slots when there is no business-hours row for that weekday', async () => {
    const { useCase } = build({ businessHoursRepository: { findAllByEstablishment: jest.fn().mockResolvedValue([]) } });

    const slots = await useCase.execute(input);
    expect(slots).toEqual([]);
  });
});
