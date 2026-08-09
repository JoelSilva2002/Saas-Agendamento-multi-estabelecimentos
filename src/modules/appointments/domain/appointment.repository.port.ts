import { Appointment } from './entities/appointment.entity';

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

export abstract class AppointmentRepositoryPort {
  /** Busy ranges (existing active appointments, already expanded by their own service's
   * buffer) for one employee on one date — used by GetAvailableSlotsUseCase to build the
   * read-only listing context. */
  abstract findBusyRangesForEmployeeOnDate(employeeId: string, date: string): Promise<BusyRangeDto[]>;

  /** Atomically re-validates availability (skipped when isFitIn) and inserts the
   * appointment, serialized per (employeeId, date) via a Postgres advisory lock — see
   * PrismaAppointmentRepository for why this one method owns the whole cross-aggregate
   * transaction. Throws SlotNotAvailableError when the slot is no longer free. */
  abstract createIfAvailable(params: CreateAppointmentIfAvailableParams): Promise<Appointment>;

  abstract findById(id: string, establishmentId: string): Promise<Appointment | null>;
}
