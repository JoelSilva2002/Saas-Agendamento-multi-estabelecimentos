import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export interface EstablishmentProps {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  timezone: string;
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

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  update(changes: { name?: string; slug?: string; timezone?: string }): Establishment {
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
      updatedAt: new Date(),
    });
  }

  toPersistenceProps(): EstablishmentProps {
    return { ...this.props };
  }
}
