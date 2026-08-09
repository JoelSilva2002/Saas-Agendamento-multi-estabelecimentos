import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type TenantStatus = 'active' | 'suspended';

export interface TenantProps {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantProps {
  id: string;
  name: string;
  slug: string;
}

export class Tenant {
  private constructor(private readonly props: TenantProps) {}

  static create(props: CreateTenantProps): Tenant {
    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('Tenant requer um nome não vazio');
    }
    if (!props.slug || !/^[a-z0-9-]+$/.test(props.slug)) {
      throw new ValidationError('Tenant requer um slug válido (apenas letras minúsculas, números e hífen)');
    }

    const now = new Date();
    return new Tenant({
      id: props.id,
      name: props.name.trim(),
      slug: props.slug.trim(),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: TenantProps): Tenant {
    return new Tenant(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get status(): TenantStatus {
    return this.props.status;
  }
}
