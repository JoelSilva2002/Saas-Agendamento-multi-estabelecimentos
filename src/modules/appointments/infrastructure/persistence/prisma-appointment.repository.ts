import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { dateToTimeString } from '../../../../shared-kernel/infrastructure/time-of-day.util';
import { Appointment } from '../../domain/entities/appointment.entity';
import {
  AppointmentRepositoryPort,
  BusyRangeDto,
  CreateAppointmentIfAvailableParams,
  ListAppointmentsFilters,
  RescheduleAppointmentIfAvailableParams,
} from '../../domain/appointment.repository.port';
import { SlotNotAvailableError } from '../../domain/errors/appointment-errors';
import {
  AvailabilityCalculator,
  AvailabilityContext,
} from '../../domain/services/availability-calculator.service';
import { AppointmentMapper } from './appointment.mapper';

const ACTIVE_STATUS_FILTER: Prisma.AppointmentWhereInput['status'] = {
  notIn: ['cancelled', 'no_show'],
};
// Name of the GiST EXCLUDE constraint from the scheduling_domain_constraints migration —
// the last-resort backstop if a conflicting insert/update ever slips past the advisory lock.
const NO_OVERLAP_CONSTRAINT_NAME = 'appointments_no_overlap_per_employee';

function dayRange(date: string): { dayStart: Date; dayEnd: Date } {
  return { dayStart: new Date(`${date}T00:00:00.000Z`), dayEnd: new Date(`${date}T23:59:59.999Z`) };
}

interface RevalidationParams {
  establishmentId: string;
  employeeId: string;
  date: string;
  startAt: Date;
  endAt: Date;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

/**
 * This repository is the one place in the `appointments` module that reaches directly into
 * other modules' tables (establishment_business_hours, employee_schedule_slots,
 * employee_time_off) instead of going through their ports — the same deliberate exception
 * already used by PrismaTenantRepository.createWithOwner (Fase 1) for operations that must
 * be atomic across what would otherwise be several aggregates. Splitting the re-validation
 * across multiple ports would mean leaking the Prisma transaction client into the
 * application layer, which is worse than this one documented crossing.
 */
@Injectable()
export class PrismaAppointmentRepository implements AppointmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findBusyRangesForEmployeeOnDate(
    employeeId: string,
    date: string,
    excludeAppointmentId?: string,
  ): Promise<BusyRangeDto[]> {
    const { dayStart, dayEnd } = dayRange(date);
    const records = await this.prisma.appointment.findMany({
      where: {
        employeeId,
        status: ACTIVE_STATUS_FILTER,
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      include: { service: { select: { bufferBeforeMinutes: true, bufferAfterMinutes: true } } },
    });

    return records.map((record) => ({
      startAt: record.startAt,
      endAt: record.endAt,
      bufferBeforeMinutes: record.service.bufferBeforeMinutes,
      bufferAfterMinutes: record.service.bufferAfterMinutes,
    }));
  }

  async findById(id: string, establishmentId: string): Promise<Appointment | null> {
    const found = await this.prisma.appointment.findFirst({ where: { id, establishmentId } });
    return found ? AppointmentMapper.toDomain(found) : null;
  }

  async findMany(
    establishmentId: string,
    filters: ListAppointmentsFilters,
  ): Promise<Appointment[]> {
    const records = await this.prisma.appointment.findMany({
      where: {
        establishmentId,
        clientId: filters.clientId,
        employeeId: filters.employeeId,
        status: filters.status,
        ...(filters.fromDate || filters.toDate
          ? {
              startAt: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { startAt: 'desc' },
    });
    return records.map(AppointmentMapper.toDomain);
  }

  async update(appointment: Appointment): Promise<Appointment> {
    const props = appointment.toPersistenceProps();
    const updated = await this.prisma.appointment.update({
      where: { id: props.id },
      data: {
        status: props.status,
        cancellationReason: props.cancellationReason,
        cancelledAt: props.cancelledAt,
        cancelledById: props.cancelledById,
        noShowFeeCents: props.noShowFeeCents,
        startAt: props.startAt,
        endAt: props.endAt,
        employeeId: props.employeeId,
      },
    });
    return AppointmentMapper.toDomain(updated);
  }

  async createIfAvailable(params: CreateAppointmentIfAvailableParams): Promise<Appointment> {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        // Serializes concurrent booking attempts for the same employee on the same day —
        // the second transaction blocks here until the first commits or rolls back, then
        // re-reads fresh data below. Auto-released at the end of the transaction.
        const lockKey = `${params.employeeId}:${params.date}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        if (!params.isFitIn) {
          const stillAvailable = await this.isStillAvailable(tx, params);
          if (!stillAvailable) {
            throw new SlotNotAvailableError();
          }
        }

        return tx.appointment.create({
          data: {
            id: params.id,
            establishmentId: params.establishmentId,
            clientId: params.clientId,
            employeeId: params.employeeId,
            serviceId: params.serviceId,
            startAt: params.startAt,
            endAt: params.endAt,
            priceCents: params.priceCents,
            isFitIn: params.isFitIn,
            createdById: params.createdById,
          },
        });
      });

      return AppointmentMapper.toDomain(created);
    } catch (error) {
      throw this.translateConflict(error);
    }
  }

  async rescheduleIfAvailable(
    params: RescheduleAppointmentIfAvailableParams,
  ): Promise<Appointment> {
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const lockKey = `${params.employeeId}:${params.date}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        const stillAvailable = await this.isStillAvailable(tx, params, params.appointmentId);
        if (!stillAvailable) {
          throw new SlotNotAvailableError();
        }

        return tx.appointment.update({
          where: { id: params.appointmentId },
          data: { employeeId: params.employeeId, startAt: params.startAt, endAt: params.endAt },
        });
      });

      return AppointmentMapper.toDomain(updated);
    } catch (error) {
      throw this.translateConflict(error);
    }
  }

  private translateConflict(error: unknown): unknown {
    if (error instanceof SlotNotAvailableError) {
      return error;
    }
    // Defensive backstop only — should be unreachable in practice since the advisory
    // lock already serializes writers, but the EXCLUDE constraint is the true source of
    // truth if this code path is ever bypassed (e.g. a future direct-SQL migration).
    if (error instanceof Error && error.message.includes(NO_OVERLAP_CONSTRAINT_NAME)) {
      return new SlotNotAvailableError();
    }
    return error;
  }

  private async isStillAvailable(
    tx: Prisma.TransactionClient,
    params: RevalidationParams,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const weekday = new Date(`${params.date}T00:00:00.000Z`).getUTCDay();
    const { dayStart, dayEnd } = dayRange(params.date);

    const [businessHours, scheduleSlots, timeOffEntries, busyAppointments] = await Promise.all([
      tx.establishmentBusinessHours.findFirst({
        where: { establishmentId: params.establishmentId, weekday },
      }),
      tx.employeeScheduleSlot.findMany({ where: { employeeId: params.employeeId, weekday } }),
      tx.employeeTimeOff.findMany({
        where: { employeeId: params.employeeId, startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
      }),
      tx.appointment.findMany({
        where: {
          employeeId: params.employeeId,
          status: ACTIVE_STATUS_FILTER,
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
          ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        },
        include: { service: { select: { bufferBeforeMinutes: true, bufferAfterMinutes: true } } },
      }),
    ]);

    const context: AvailabilityContext = {
      date: params.date,
      businessHours: businessHours
        ? {
            isClosed: businessHours.isClosed,
            openTime: dateToTimeString(businessHours.openTime),
            closeTime: dateToTimeString(businessHours.closeTime),
          }
        : { isClosed: true, openTime: null, closeTime: null },
      workingSlots: scheduleSlots
        .filter((slot) => slot.slotType === 'working')
        .map((slot) => ({
          startTime: dateToTimeString(slot.startTime) as string,
          endTime: dateToTimeString(slot.endTime) as string,
        })),
      breakSlots: scheduleSlots
        .filter((slot) => slot.slotType === 'break')
        .map((slot) => ({
          startTime: dateToTimeString(slot.startTime) as string,
          endTime: dateToTimeString(slot.endTime) as string,
        })),
      timeOffRanges: timeOffEntries.map((entry) => ({ start: entry.startAt, end: entry.endAt })),
      busyRanges: busyAppointments.map((appointment) => ({
        start: new Date(
          appointment.startAt.getTime() - appointment.service.bufferBeforeMinutes * 60_000,
        ),
        end: new Date(
          appointment.endAt.getTime() + appointment.service.bufferAfterMinutes * 60_000,
        ),
      })),
      // durationMinutes/slotIntervalMinutes are unused by isRangeAvailable (it works off the
      // explicit candidateStart/candidateEnd instead) — present only to satisfy the shared
      // context shape.
      durationMinutes: Math.round((params.endAt.getTime() - params.startAt.getTime()) / 60_000),
      bufferBeforeMinutes: params.bufferBeforeMinutes,
      bufferAfterMinutes: params.bufferAfterMinutes,
      slotIntervalMinutes: 1,
    };

    return AvailabilityCalculator.isRangeAvailable(context, params.startAt, params.endAt);
  }
}
