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
  /** Free-text presentation shown to clients browsing the public directory. */
  description: string | null;
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
  depositEnabled: boolean;
  /** Percentage (1-100) of the service price charged upfront when a "deposit" payment is
   * created. Same null-iff-disabled invariant as noShowFeePercentage. */
  depositPercentage: number | null;
  /** Which of the two standard reminder windows fire for this establishment's appointments. */
  reminder24hEnabled: boolean;
  reminder2hEnabled: boolean;
  /** Channel kill switches — apply to every notification type, not just reminders. */
  notifyEmailEnabled: boolean;
  notifyWhatsappEnabled: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEstablishmentProps {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  timezone?: string;
  address?: Partial<EstablishmentAddress>;
  phones?: string[];
  cancellationMinHoursNotice?: number;
  noShowFeeEnabled?: boolean;
  noShowFeePercentage?: number | null;
  depositEnabled?: boolean;
  depositPercentage?: number | null;
  reminder24hEnabled?: boolean;
  reminder2hEnabled?: boolean;
  notifyEmailEnabled?: boolean;
  notifyWhatsappEnabled?: boolean;
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
    Establishment.assertUsableSlug(props.slug);

    const cancellationMinHoursNotice = props.cancellationMinHoursNotice ?? 24;
    const noShowFeeEnabled = props.noShowFeeEnabled ?? false;
    const noShowFeePercentage = props.noShowFeePercentage ?? null;
    if (!Number.isInteger(cancellationMinHoursNotice) || cancellationMinHoursNotice < 0) {
      throw new ValidationError('cancellationMinHoursNotice deve ser um inteiro não negativo');
    }
    Establishment.assertValidPercentagePolicy(
      noShowFeeEnabled,
      noShowFeePercentage,
      'noShowFeePercentage',
      'a multa por no-show',
    );

    const depositEnabled = props.depositEnabled ?? false;
    const depositPercentage = props.depositPercentage ?? null;
    Establishment.assertValidPercentagePolicy(
      depositEnabled,
      depositPercentage,
      'depositPercentage',
      'o sinal/depósito',
    );

    const now = new Date();
    return new Establishment({
      id: props.id,
      tenantId: props.tenantId,
      name: props.name.trim(),
      slug: props.slug.trim(),
      description: props.description?.trim() || null,
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
      depositEnabled,
      depositPercentage,
      reminder24hEnabled: props.reminder24hEnabled ?? true,
      reminder2hEnabled: props.reminder2hEnabled ?? true,
      notifyEmailEnabled: props.notifyEmailEnabled ?? true,
      notifyWhatsappEnabled: props.notifyWhatsappEnabled ?? true,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** The slug is the establishment's public URL (/<slug>), so it cannot be a word the app
   * already routes to — a "buscar" establishment would be permanently unreachable, shadowed
   * by the search page. Keep in sync with the static routes under app/(public). */
  private static readonly RESERVED_SLUGS = [
    'buscar',
    'login',
    'entrar',
    'admin',
    'superadmin',
    'public',
    'meus-agendamentos',
  ];

  private static assertUsableSlug(slug: string | undefined): void {
    const normalized = slug?.trim().toLowerCase();
    if (!normalized) {
      throw new ValidationError('Establishment requer um slug não vazio');
    }
    if (Establishment.RESERVED_SLUGS.includes(normalized)) {
      throw new ValidationError(`'${normalized}' é uma palavra reservada e não pode ser um slug`);
    }
  }

  /** Shared invariant for both noShowFeePercentage and depositPercentage: null iff the
   * matching *Enabled flag is false, an integer in [1,100] iff it's true. */
  private static assertValidPercentagePolicy(
    enabled: boolean,
    percentage: number | null,
    fieldName: string,
    featureLabel: string,
  ): void {
    if (enabled) {
      if (
        percentage === null ||
        !Number.isInteger(percentage) ||
        percentage < 1 ||
        percentage > 100
      ) {
        throw new ValidationError(
          `${fieldName} deve ser um inteiro entre 1 e 100 quando ${featureLabel} está ativa`,
        );
      }
    } else if (percentage !== null) {
      throw new ValidationError(
        `${fieldName} deve ser nulo quando ${featureLabel} está desativada`,
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

  get description(): string | null {
    return this.props.description;
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

  get depositEnabled(): boolean {
    return this.props.depositEnabled;
  }

  get depositPercentage(): number | null {
    return this.props.depositPercentage;
  }

  get reminder24hEnabled(): boolean {
    return this.props.reminder24hEnabled;
  }

  get reminder2hEnabled(): boolean {
    return this.props.reminder2hEnabled;
  }

  get notifyEmailEnabled(): boolean {
    return this.props.notifyEmailEnabled;
  }

  get notifyWhatsappEnabled(): boolean {
    return this.props.notifyWhatsappEnabled;
  }

  update(changes: {
    name?: string;
    slug?: string;
    description?: string | null;
    timezone?: string;
    address?: Partial<EstablishmentAddress>;
    phones?: string[];
    cancellationMinHoursNotice?: number;
    noShowFeeEnabled?: boolean;
    noShowFeePercentage?: number | null;
    depositEnabled?: boolean;
    depositPercentage?: number | null;
    reminder24hEnabled?: boolean;
    reminder2hEnabled?: boolean;
    notifyEmailEnabled?: boolean;
    notifyWhatsappEnabled?: boolean;
  }): Establishment {
    const name = changes.name?.trim() ?? this.props.name;
    const slug = changes.slug?.trim() ?? this.props.slug;
    if (name.length === 0) {
      throw new ValidationError('Establishment requer um nome não vazio');
    }
    Establishment.assertUsableSlug(slug);

    const cancellationMinHoursNotice =
      changes.cancellationMinHoursNotice ?? this.props.cancellationMinHoursNotice;
    if (!Number.isInteger(cancellationMinHoursNotice) || cancellationMinHoursNotice < 0) {
      throw new ValidationError('cancellationMinHoursNotice deve ser um inteiro não negativo');
    }

    // Disabling a *Enabled flag always clears its percentage, even if the caller didn't
    // explicitly null it — a bare `{ noShowFeeEnabled: false }` patch is the common "turn it
    // off" call and shouldn't also require remembering to clear the percentage in the same
    // request.
    const noShowFeeEnabled = changes.noShowFeeEnabled ?? this.props.noShowFeeEnabled;
    const noShowFeePercentage = !noShowFeeEnabled
      ? null
      : changes.noShowFeePercentage !== undefined
        ? changes.noShowFeePercentage
        : this.props.noShowFeePercentage;
    Establishment.assertValidPercentagePolicy(
      noShowFeeEnabled,
      noShowFeePercentage,
      'noShowFeePercentage',
      'a multa por no-show',
    );

    const depositEnabled = changes.depositEnabled ?? this.props.depositEnabled;
    const depositPercentage = !depositEnabled
      ? null
      : changes.depositPercentage !== undefined
        ? changes.depositPercentage
        : this.props.depositPercentage;
    Establishment.assertValidPercentagePolicy(
      depositEnabled,
      depositPercentage,
      'depositPercentage',
      'o sinal/depósito',
    );

    return new Establishment({
      ...this.props,
      name,
      slug,
      // Distinguishes "not sent" from "cleared": undefined keeps the current text, an empty
      // string wipes it.
      description:
        changes.description !== undefined
          ? changes.description?.trim() || null
          : this.props.description,
      timezone: changes.timezone ?? this.props.timezone,
      address: changes.address ? { ...this.props.address, ...changes.address } : this.props.address,
      phones: changes.phones ?? this.props.phones,
      cancellationMinHoursNotice,
      noShowFeeEnabled,
      noShowFeePercentage,
      depositEnabled,
      depositPercentage,
      reminder24hEnabled: changes.reminder24hEnabled ?? this.props.reminder24hEnabled,
      reminder2hEnabled: changes.reminder2hEnabled ?? this.props.reminder2hEnabled,
      notifyEmailEnabled: changes.notifyEmailEnabled ?? this.props.notifyEmailEnabled,
      notifyWhatsappEnabled: changes.notifyWhatsappEnabled ?? this.props.notifyWhatsappEnabled,
      updatedAt: new Date(),
    });
  }

  toPersistenceProps(): EstablishmentProps {
    return { ...this.props };
  }
}
