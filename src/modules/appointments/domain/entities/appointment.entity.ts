import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

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

  toPersistenceProps(): AppointmentProps {
    return { ...this.props };
  }
}
