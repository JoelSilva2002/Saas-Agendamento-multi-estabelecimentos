import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type TenantStatus = 'active' | 'suspended' | 'cancelled';

/** Every tenant gets the full feature set — there are no tiers. The column is kept so the
 * value is explicit in the data, not so it can vary. */
export const TENANT_PLAN = 'premium';

export interface TenantProps {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  plan: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantProps {
  id: string;
  name: string;
  slug: string;
  document?: string | null;
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
      document: props.document?.trim() || null,
      plan: TENANT_PLAN,
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

  get document(): string | null {
    return this.props.document;
  }

  get plan(): string {
    return this.props.plan;
  }

  get status(): TenantStatus {
    return this.props.status;
  }

  /** Cancelled is a terminal state — once cancelled, a tenant can't be reactivated or
   * re-suspended (a SuperAdmin who cancelled by mistake should create a new tenant, not
   * resurrect billing/data history on the old one). */
  changeStatus(status: TenantStatus): Tenant {
    if (this.props.status === 'cancelled') {
      throw new ValidationError('Tenant cancelado não pode ter o status alterado');
    }
    return new Tenant({ ...this.props, status, updatedAt: new Date() });
  }
}
