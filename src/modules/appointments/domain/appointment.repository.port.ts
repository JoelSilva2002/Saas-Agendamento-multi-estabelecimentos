import { Appointment, AppointmentStatus } from './entities/appointment.entity';

export interface BusyRangeDto {
  startAt: Date;
  endAt: Date;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

export interface CreateAppointmentIfAvailableParams {
  id: string;
  establishmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  /** Calendar date `startAt` falls on ("YYYY-MM-DD") — used to look up that weekday's
   * business hours / schedule slots during the in-transaction re-validation. */
  date: string;
  startAt: Date;
  endAt: Date;
  priceCents: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  isFitIn: boolean;
  createdById: string;
}

export interface RescheduleAppointmentIfAvailableParams {
  appointmentId: string;
  establishmentId: string;
  employeeId: string;
  /** Calendar date the NEW startAt falls on ("YYYY-MM-DD"). */
  date: string;
  startAt: Date;
  endAt: Date;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

export interface ListAppointmentsFilters {
  clientId?: string;
  employeeId?: string;
  status?: AppointmentStatus;
  fromDate?: Date;
  toDate?: Date;
}

export abstract class AppointmentRepositoryPort {
  /** Busy ranges (existing active appointments, already expanded by their own service's
   * buffer) for one employee on one date — used by GetAvailableSlotsUseCase to build the
   * read-only listing context. `excludeAppointmentId` lets a reschedule flow list slots
   * without the appointment's own current occupancy counting against it. */
  abstract findBusyRangesForEmployeeOnDate(
    employeeId: string,
    date: string,
    excludeAppointmentId?: string,
  ): Promise<BusyRangeDto[]>;

  /** Atomically re-validates availability (skipped when isFitIn) and inserts the
   * appointment, serialized per (employeeId, date) via a Postgres advisory lock — see
   * PrismaAppointmentRepository for why this one method owns the whole cross-aggregate
   * transaction. Throws SlotNotAvailableError when the slot is no longer free. */
  abstract createIfAvailable(params: CreateAppointmentIfAvailableParams): Promise<Appointment>;

  /** Same locked-transaction + re-validation pattern as createIfAvailable, but updates an
   * existing appointment's employee/startAt/endAt in place instead of inserting a new row —
   * excludes the appointment's own current slot from the conflict check. Always validates
   * (no fit-in bypass for reschedule). Throws SlotNotAvailableError when the target slot
   * isn't free. */
  abstract rescheduleIfAvailable(
    params: RescheduleAppointmentIfAvailableParams,
  ): Promise<Appointment>;

  abstract findById(id: string, establishmentId: string): Promise<Appointment | null>;

  abstract findMany(
    establishmentId: string,
    filters: ListAppointmentsFilters,
  ): Promise<Appointment[]>;

  /** Plain field persist for transitions that don't touch scheduling (cancel, no-show) —
   * no lock needed since these only ever narrow occupancy, never introduce a conflict. */
  abstract update(appointment: Appointment): Promise<Appointment>;
}
