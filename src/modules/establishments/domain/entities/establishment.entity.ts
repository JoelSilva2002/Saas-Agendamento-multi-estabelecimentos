import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export interface EstablishmentAddress {
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
}

export interface EstablishmentProps {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  timezone: string;
  address: EstablishmentAddress;
  phones: string[];
  /** Minimum notice (in hours) a client must give to cancel/reschedule their own
   * appointment. Staff-initiated cancellations/reschedules ignore this. */
  cancellationMinHoursNotice: number;
  noShowFeeEnabled: boolean;
  /** Percentage (1-100) of the service price charged when a client no-shows. Must be null
   * when noShowFeeEnabled is false, and a value in [1,100] when true. */
  noShowFeePercentage: number | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEstablishmentProps {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  timezone?: string;
  address?: Partial<EstablishmentAddress>;
  phones?: string[];
  cancellationMinHoursNotice?: number;
  noShowFeeEnabled?: boolean;
  noShowFeePercentage?: number | null;
}

export class Establishment {
  private constructor(private readonly props: EstablishmentProps) {}

  static create(props: CreateEstablishmentProps): Establishment {
    if (!props.tenantId) {
      throw new ValidationError('Establishment requer um tenantId válido');
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('Establishment requer um nome não vazio');
    }
    if (!props.slug || props.slug.trim().length === 0) {
      throw new ValidationError('Establishment requer um slug não vazio');
    }

    const cancellationMinHoursNotice = props.cancellationMinHoursNotice ?? 24;
    const noShowFeeEnabled = props.noShowFeeEnabled ?? false;
    const noShowFeePercentage = props.noShowFeePercentage ?? null;
    Establishment.assertValidCancellationPolicy(
      cancellationMinHoursNotice,
      noShowFeeEnabled,
      noShowFeePercentage,
    );

    const now = new Date();
    return new Establishment({
      id: props.id,
      tenantId: props.tenantId,
      name: props.name.trim(),
      slug: props.slug.trim(),
      timezone: props.timezone ?? 'UTC',
      address: {
        street: props.address?.street ?? null,
        number: props.address?.number ?? null,
        complement: props.address?.complement ?? null,
        neighborhood: props.address?.neighborhood ?? null,
        city: props.address?.city ?? null,
        state: props.address?.state ?? null,
        zipCode: props.address?.zipCode ?? null,
        country: props.address?.country ?? 'BR',
      },
      phones: props.phones ?? [],
      cancellationMinHoursNotice,
      noShowFeeEnabled,
      noShowFeePercentage,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  private static assertValidCancellationPolicy(
    cancellationMinHoursNotice: number,
    noShowFeeEnabled: boolean,
    noShowFeePercentage: number | null,
  ): void {
    if (!Number.isInteger(cancellationMinHoursNotice) || cancellationMinHoursNotice < 0) {
      throw new ValidationError('cancellationMinHoursNotice deve ser um inteiro não negativo');
    }
    if (noShowFeeEnabled) {
      if (
        noShowFeePercentage === null ||
        !Number.isInteger(noShowFeePercentage) ||
        noShowFeePercentage < 1 ||
        noShowFeePercentage > 100
      ) {
        throw new ValidationError(
          'noShowFeePercentage deve ser um inteiro entre 1 e 100 quando a multa está ativa',
        );
      }
    } else if (noShowFeePercentage !== null) {
      throw new ValidationError(
        'noShowFeePercentage deve ser nulo quando a multa por no-show está desativada',
      );
    }
  }

  static fromPersistence(props: EstablishmentProps): Establishment {
    return new Establishment(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get address(): EstablishmentAddress {
    return this.props.address;
  }

  get phones(): string[] {
    return this.props.phones;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get cancellationMinHoursNotice(): number {
    return this.props.cancellationMinHoursNotice;
  }

  get noShowFeeEnabled(): boolean {
    return this.props.noShowFeeEnabled;
  }

  get noShowFeePercentage(): number | null {
    return this.props.noShowFeePercentage;
  }

  update(changes: {
    name?: string;
    slug?: string;
    timezone?: string;
    address?: Partial<EstablishmentAddress>;
    phones?: string[];
    cancellationMinHoursNotice?: number;
    noShowFeeEnabled?: boolean;
    noShowFeePercentage?: number | null;
  }): Establishment {
    const name = changes.name?.trim() ?? this.props.name;
    const slug = changes.slug?.trim() ?? this.props.slug;
    if (name.length === 0) {
      throw new ValidationError('Establishment requer um nome não vazio');
    }
    if (slug.length === 0) {
      throw new ValidationError('Establishment requer um slug não vazio');
    }

    const cancellationMinHoursNotice =
      changes.cancellationMinHoursNotice ?? this.props.cancellationMinHoursNotice;
    const noShowFeeEnabled = changes.noShowFeeEnabled ?? this.props.noShowFeeEnabled;
    // Disabling the fee always clears the percentage, even if the caller didn't explicitly
    // null it — a bare `{ noShowFeeEnabled: false }` patch is the common "turn it off" call
    // and shouldn't also require remembering to clear the percentage in the same request.
    const noShowFeePercentage = !noShowFeeEnabled
      ? null
      : changes.noShowFeePercentage !== undefined
        ? changes.noShowFeePercentage
        : this.props.noShowFeePercentage;
    Establishment.assertValidCancellationPolicy(
      cancellationMinHoursNotice,
      noShowFeeEnabled,
      noShowFeePercentage,
    );

    return new Establishment({
      ...this.props,
      name,
      slug,
      timezone: changes.timezone ?? this.props.timezone,
      address: changes.address ? { ...this.props.address, ...changes.address } : this.props.address,
      phones: changes.phones ?? this.props.phones,
      cancellationMinHoursNotice,
      noShowFeeEnabled,
      noShowFeePercentage,
      updatedAt: new Date(),
    });
  }

  toPersistenceProps(): EstablishmentProps {
    return { ...this.props };
  }
}
