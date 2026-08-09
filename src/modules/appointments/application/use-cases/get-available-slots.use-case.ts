import { Injectable } from '@nestjs/common';
import { ServiceRepositoryPort } from '../../../services/domain/service.repository.port';
import { ServiceNotFoundError } from '../../../services/domain/errors/service-errors';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { EmployeeNotFoundError } from '../../../employees/domain/errors/employee-errors';
import { EmployeeScheduleRepositoryPort } from '../../../employees/domain/employee-schedule.repository.port';
import { EmployeeTimeOffRepositoryPort } from '../../../employees/domain/employee-time-off.repository.port';
import { BusinessHoursRepositoryPort } from '../../../establishments/domain/business-hours.repository.port';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { EmployeeNotEligibleForServiceError } from '../../domain/errors/appointment-errors';
import { AvailabilityCalculator, AvailableSlot, TimeRange } from '../../domain/services/availability-calculator.service';

const DEFAULT_SLOT_INTERVAL_MINUTES = 15;

export interface GetAvailableSlotsInput {
  establishmentId: string;
  serviceId: string;
  employeeId: string;
  /** "YYYY-MM-DD" */
  date: string;
  slotIntervalMinutes?: number;
  /** Defaults to the real current time; only affects results when `date` is today. */
  now?: Date;
}

@Injectable()
export class GetAvailableSlotsUseCase {
  constructor(
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly businessHoursRepository: BusinessHoursRepositoryPort,
    private readonly scheduleRepository: EmployeeScheduleRepositoryPort,
    private readonly timeOffRepository: EmployeeTimeOffRepositoryPort,
    private readonly appointmentRepository: AppointmentRepositoryPort,
  ) {}

  async execute(input: GetAvailableSlotsInput): Promise<AvailableSlot[]> {
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

    const weekday = new Date(`${input.date}T00:00:00.000Z`).getUTCDay();

    const [businessHoursDays, scheduleSlots, timeOffEntries, busyRanges] = await Promise.all([
      this.businessHoursRepository.findAllByEstablishment(input.establishmentId),
      this.scheduleRepository.findAllByEmployee(input.employeeId),
      this.timeOffRepository.findAllByEmployee(input.employeeId),
      this.appointmentRepository.findBusyRangesForEmployeeOnDate(input.employeeId, input.date),
    ]);

    const businessHoursDay = businessHoursDays.find((day) => day.weekday === weekday);
    const daySlots = scheduleSlots.filter((slot) => slot.weekday === weekday);
    const dayStart = new Date(`${input.date}T00:00:00.000Z`);
    const dayEnd = new Date(`${input.date}T23:59:59.999Z`);

    const timeOffRanges: TimeRange[] = timeOffEntries
      .filter((entry) => entry.startAt < dayEnd && entry.endAt > dayStart)
      .map((entry) => ({ start: entry.startAt, end: entry.endAt }));

    const expandedBusyRanges: TimeRange[] = busyRanges.map((range) => ({
      start: new Date(range.startAt.getTime() - range.bufferBeforeMinutes * 60_000),
      end: new Date(range.endAt.getTime() + range.bufferAfterMinutes * 60_000),
    }));

    return AvailabilityCalculator.computeAvailableSlots({
      date: input.date,
      businessHours: businessHoursDay
        ? { isClosed: businessHoursDay.isClosed, openTime: businessHoursDay.openTime, closeTime: businessHoursDay.closeTime }
        : { isClosed: true, openTime: null, closeTime: null },
      workingSlots: daySlots.filter((slot) => slot.slotType === 'working'),
      breakSlots: daySlots.filter((slot) => slot.slotType === 'break'),
      timeOffRanges,
      busyRanges: expandedBusyRanges,
      durationMinutes: service.durationMinutes,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      slotIntervalMinutes: input.slotIntervalMinutes ?? DEFAULT_SLOT_INTERVAL_MINUTES,
      now: input.now,
    });
  }
}
