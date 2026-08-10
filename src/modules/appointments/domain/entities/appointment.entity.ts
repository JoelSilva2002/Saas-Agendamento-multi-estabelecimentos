import { ValidationError } from '../../../../shared-kernel/domain/domain-error';
import {
  CancellationReasonRequiredError,
  InvalidAppointmentStatusTransitionError,
} from '../errors/appointment-errors';

export type AppointmentStatus =
  'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

const TERMINAL_STATUSES: AppointmentStatus[] = ['cancelled', 'completed', 'no_show'];

export interface AppointmentProps {
  id: string;
  establishmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  priceCents: number;
  isFitIn: boolean;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  cancelledById: string | null;
  noShowFeeCents: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentProps {
  id: string;
  establishmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  priceCents: number;
  isFitIn?: boolean;
  createdById: string;
}

export class Appointment {
  private constructor(private readonly props: AppointmentProps) {}

  static create(props: CreateAppointmentProps): Appointment {
    if (props.startAt >= props.endAt) {
      throw new ValidationError('Appointment requer startAt anterior a endAt');
    }
    if (!Number.isInteger(props.priceCents) || props.priceCents < 0) {
      throw new ValidationError('Appointment requer priceCents inteiro e não negativo');
    }

    const now = new Date();
    return new Appointment({
      id: props.id,
      establishmentId: props.establishmentId,
      clientId: props.clientId,
      employeeId: props.employeeId,
      serviceId: props.serviceId,
      startAt: props.startAt,
      endAt: props.endAt,
      status: 'pending',
      priceCents: props.priceCents,
      isFitIn: props.isFitIn ?? false,
      cancellationReason: null,
      cancelledAt: null,
      cancelledById: null,
      noShowFeeCents: null,
      createdById: props.createdById,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: AppointmentProps): Appointment {
    return new Appointment(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get employeeId(): string {
    return this.props.employeeId;
  }

  get serviceId(): string {
    return this.props.serviceId;
  }

  get startAt(): Date {
    return this.props.startAt;
  }

  get endAt(): Date {
    return this.props.endAt;
  }

  get status(): AppointmentStatus {
    return this.props.status;
  }

  get priceCents(): number {
    return this.props.priceCents;
  }

  get isFitIn(): boolean {
    return this.props.isFitIn;
  }

  get cancellationReason(): string | null {
    return this.props.cancellationReason;
  }

  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  get cancelledById(): string | null {
    return this.props.cancelledById;
  }

  get noShowFeeCents(): number | null {
    return this.props.noShowFeeCents;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  /** Cancels the appointment. Enforces the entity's own invariants only (reason present,
   * not already in a terminal status) — ownership and the minimum-notice window are
   * business rules that depend on the caller's role/time, so they're checked one layer up
   * in CancelAppointmentUseCase. */
  cancel(reason: string, cancelledById: string): Appointment {
    this.assertNotTerminal();
    if (!reason || reason.trim().length === 0) {
      throw new CancellationReasonRequiredError();
    }

    return new Appointment({
      ...this.props,
      status: 'cancelled',
      cancellationReason: reason.trim(),
      cancelledAt: new Date(),
      cancelledById,
      updatedAt: new Date(),
    });
  }

  reschedule(newStartAt: Date, newEndAt: Date, employeeId?: string): Appointment {
    this.assertNotTerminal();
    if (newStartAt >= newEndAt) {
      throw new ValidationError('Appointment requer startAt anterior a endAt');
    }

    return new Appointment({
      ...this.props,
      startAt: newStartAt,
      endAt: newEndAt,
      employeeId: employeeId ?? this.props.employeeId,
      updatedAt: new Date(),
    });
  }

  markNoShow(noShowFeeCents: number | null): Appointment {
    this.assertNotTerminal();

    return new Appointment({
      ...this.props,
      status: 'no_show',
      noShowFeeCents,
      updatedAt: new Date(),
    });
  }

  /** QR check-in: the client (or staff on their behalf) showed up. Only valid from the two
   * pre-visit statuses — once in progress or further, checking in again is meaningless,
   * which also makes the check-in token effectively single-use without needing its own
   * expiry (see checkin-token.util.ts). */
  checkIn(): Appointment {
    if (this.props.status !== 'pending' && this.props.status !== 'confirmed') {
      throw new InvalidAppointmentStatusTransitionError(this.props.status);
    }
    return new Appointment({ ...this.props, status: 'in_progress', updatedAt: new Date() });
  }

  /** Staff marks the visit as finished. Reviews and the sales/productivity reports only
   * count appointments that reached this status. */
  complete(): Appointment {
    this.assertNotTerminal();
    return new Appointment({ ...this.props, status: 'completed', updatedAt: new Date() });
  }

  private assertNotTerminal(): void {
    if (TERMINAL_STATUSES.includes(this.props.status)) {
      throw new InvalidAppointmentStatusTransitionError(this.props.status);
    }
  }

  toPersistenceProps(): AppointmentProps {
    return { ...this.props };
  }
}
