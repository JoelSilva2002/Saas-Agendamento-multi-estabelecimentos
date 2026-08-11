import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import {
  AvailabilityCalculator,
  TimeRange,
} from '../../../appointments/domain/services/availability-calculator.service';
import { PaymentRepositoryPort } from '../../../payments/domain/payment.repository.port';
import { ClientProfileRepositoryPort } from '../../../clients/domain/client-profile.repository.port';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { EmployeeScheduleRepositoryPort } from '../../../employees/domain/employee-schedule.repository.port';
import { EmployeeTimeOffRepositoryPort } from '../../../employees/domain/employee-time-off.repository.port';
import { BusinessHoursRepositoryPort } from '../../../establishments/domain/business-hours.repository.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';

// "Horários vagos" has no service context on a dashboard summary (duration/buffer vary per
// service), so it's computed as a neutral 30-minute/no-buffer slot count per active employee
// — a proxy for free capacity that day, not real availability for a specific service (that's
// what GET .../availability is for).
const VACANT_SLOT_DURATION_MINUTES = 30;

export interface DailySummary {
  date: string;
  appointments: {
    total: number;
    byStatus: Record<string, number>;
  };
  revenueCents: number;
  newClients: number;
  cancellationRate: number;
  vacantSlots: number;
}

@Injectable()
export class GetDailySummaryUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly paymentRepository: PaymentRepositoryPort,
    private readonly clientProfileRepository: ClientProfileRepositoryPort,
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly employeeScheduleRepository: EmployeeScheduleRepositoryPort,
    private readonly employeeTimeOffRepository: EmployeeTimeOffRepositoryPort,
    private readonly businessHoursRepository: BusinessHoursRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
  ) {}

  async execute(establishmentId: string, date: string): Promise<DailySummary> {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    // Half-open [dayStart, nextDayStart) — used for the aggregate queries (revenue, new
    // clients) instead of the inclusive dayEnd above, to avoid double-counting anything
    // landing exactly at midnight.
    const nextDayStart = new Date(dayStart.getTime() + 24 * 60 * 60_000);

    const [appointments, revenueCents, newClients, vacantSlots] = await Promise.all([
      this.appointmentRepository.findMany(establishmentId, { fromDate: dayStart, toDate: dayEnd }),
      this.paymentRepository.sumPaidAmountBetween(establishmentId, dayStart, nextDayStart),
      this.clientProfileRepository.countCreatedBetween(establishmentId, dayStart, nextDayStart),
      this.countVacantSlots(establishmentId, date),
    ]);

    const byStatus: Record<string, number> = {};
    for (const appointment of appointments) {
      byStatus[appointment.status] = (byStatus[appointment.status] ?? 0) + 1;
    }
    const cancelledCount = byStatus.cancelled ?? 0;
    const cancellationRate = appointments.length > 0 ? cancelledCount / appointments.length : 0;

    return {
      date,
      appointments: { total: appointments.length, byStatus },
      revenueCents,
      newClients,
      cancellationRate,
      vacantSlots,
    };
  }

  private async countVacantSlots(establishmentId: string, date: string): Promise<number> {
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const [employees, businessHoursDays, establishmentTimeZone] = await Promise.all([
      this.employeeRepository.findAllByEstablishment(establishmentId),
      this.businessHoursRepository.findAllByEstablishment(establishmentId),
      this.establishmentRepository.getTimeZone(establishmentId),
    ]);
    const timeZone = establishmentTimeZone ?? 'UTC';
    const businessHoursDay = businessHoursDays.find((day) => day.weekday === weekday);
    const activeEmployees = employees.filter((employee) => employee.status === 'active');

    let total = 0;
    for (const employee of activeEmployees) {
      const [scheduleSlots, timeOffEntries, busyRanges] = await Promise.all([
        this.employeeScheduleRepository.findAllByEmployee(employee.id),
        this.employeeTimeOffRepository.findAllByEmployee(employee.id),
        this.appointmentRepository.findBusyRangesForEmployeeOnDate(employee.id, date),
      ]);

      const daySlots = scheduleSlots.filter((slot) => slot.weekday === weekday);

      const timeOffRanges: TimeRange[] = timeOffEntries
        .filter((entry) => entry.startAt < dayEnd && entry.endAt > dayStart)
        .map((entry) => ({ start: entry.startAt, end: entry.endAt }));

      const expandedBusyRanges: TimeRange[] = busyRanges.map((range) => ({
        start: new Date(range.startAt.getTime() - range.bufferBeforeMinutes * 60_000),
        end: new Date(range.endAt.getTime() + range.bufferAfterMinutes * 60_000),
      }));

      const slots = AvailabilityCalculator.computeAvailableSlots({
        date,
        timeZone,
        businessHours: businessHoursDay
          ? {
              isClosed: businessHoursDay.isClosed,
              openTime: businessHoursDay.openTime,
              closeTime: businessHoursDay.closeTime,
            }
          : { isClosed: true, openTime: null, closeTime: null },
        workingSlots: daySlots.filter((slot) => slot.slotType === 'working'),
        breakSlots: daySlots.filter((slot) => slot.slotType === 'break'),
        timeOffRanges,
        busyRanges: expandedBusyRanges,
        durationMinutes: VACANT_SLOT_DURATION_MINUTES,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        slotIntervalMinutes: VACANT_SLOT_DURATION_MINUTES,
      });

      total += slots.length;
    }

    return total;
  }
}
