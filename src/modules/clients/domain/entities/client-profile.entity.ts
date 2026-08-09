import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export interface ClientProfileProps {
  id: string;
  establishmentId: string;
  userId: string;
  phone: string | null;
  birthDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientProfileProps {
  id: string;
  establishmentId: string;
  userId: string;
  phone?: string | null;
  birthDate?: Date | null;
  notes?: string | null;
}

export class ClientProfile {
  private constructor(private readonly props: ClientProfileProps) {}

  static create(props: CreateClientProfileProps): ClientProfile {
    if (!props.establishmentId) {
      throw new ValidationError('ClientProfile requer um establishmentId válido');
    }
    if (!props.userId) {
      throw new ValidationError('ClientProfile requer um userId válido');
    }

    const now = new Date();
    return new ClientProfile({
      id: props.id,
      establishmentId: props.establishmentId,
      userId: props.userId,
      phone: props.phone ?? null,
      birthDate: props.birthDate ?? null,
      notes: props.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: ClientProfileProps): ClientProfile {
    return new ClientProfile(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get birthDate(): Date | null {
    return this.props.birthDate;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  toPersistenceProps(): ClientProfileProps {
    return { ...this.props };
  }
}
