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
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
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

  update(changes: {
    name?: string;
    slug?: string;
    timezone?: string;
    address?: Partial<EstablishmentAddress>;
    phones?: string[];
  }): Establishment {
    const name = changes.name?.trim() ?? this.props.name;
    const slug = changes.slug?.trim() ?? this.props.slug;
    if (name.length === 0) {
      throw new ValidationError('Establishment requer um nome não vazio');
    }
    if (slug.length === 0) {
      throw new ValidationError('Establishment requer um slug não vazio');
    }
    return new Establishment({
      ...this.props,
      name,
      slug,
      timezone: changes.timezone ?? this.props.timezone,
      address: changes.address ? { ...this.props.address, ...changes.address } : this.props.address,
      phones: changes.phones ?? this.props.phones,
      updatedAt: new Date(),
    });
  }

  toPersistenceProps(): EstablishmentProps {
    return { ...this.props };
  }
}
