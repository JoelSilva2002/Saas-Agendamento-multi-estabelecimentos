import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type WaitlistPeriod = 'morning' | 'afternoon' | 'evening' | 'any';
export type WaitlistStatus = 'waiting' | 'notified' | 'converted' | 'expired' | 'cancelled';

export interface WaitlistEntryProps {
  id: string;
  establishmentId: string;
  clientId: string;
  serviceId: string;
  employeeId: string | null;
  desiredDate: Date;
  desiredPeriod: WaitlistPeriod;
  status: WaitlistStatus;
  createdAt: Date;
}

export interface CreateWaitlistEntryProps {
  id: string;
  establishmentId: string;
  clientId: string;
  serviceId: string;
  employeeId?: string | null;
  desiredDate: Date;
  desiredPeriod?: WaitlistPeriod;
}

export class WaitlistEntry {
  private constructor(private readonly props: WaitlistEntryProps) {}

  static create(props: CreateWaitlistEntryProps): WaitlistEntry {
    if (!props.establishmentId || !props.clientId || !props.serviceId) {
      throw new ValidationError('WaitlistEntry requer establishmentId, clientId e serviceId');
    }

    return new WaitlistEntry({
      id: props.id,
      establishmentId: props.establishmentId,
      clientId: props.clientId,
      serviceId: props.serviceId,
      employeeId: props.employeeId ?? null,
      desiredDate: props.desiredDate,
      desiredPeriod: props.desiredPeriod ?? 'any',
      status: 'waiting',
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: WaitlistEntryProps): WaitlistEntry {
    return new WaitlistEntry(props);
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

  get serviceId(): string {
    return this.props.serviceId;
  }

  get employeeId(): string | null {
    return this.props.employeeId;
  }

  get desiredDate(): Date {
    return this.props.desiredDate;
  }

  get desiredPeriod(): WaitlistPeriod {
    return this.props.desiredPeriod;
  }

  get status(): WaitlistStatus {
    return this.props.status;
  }

  private transitionTo(status: WaitlistStatus): WaitlistEntry {
    if (this.props.status !== 'waiting') {
      throw new ValidationError(
        `Não é possível alterar uma entrada da fila com status '${this.props.status}'`,
      );
    }
    return new WaitlistEntry({ ...this.props, status });
  }

  markNotified(): WaitlistEntry {
    return this.transitionTo('notified');
  }

  cancel(): WaitlistEntry {
    return this.transitionTo('cancelled');
  }

  toPersistenceProps(): WaitlistEntryProps {
    return { ...this.props };
  }
}
