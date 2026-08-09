import { Tenant } from './entities/tenant.entity';

export interface CreateTenantWithOwnerParams {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPasswordHash: string;
  ownerRoleId: string;
}

export interface TenantWithOwner {
  tenant: Tenant;
  ownerUserId: string;
}

export abstract class TenantRepositoryPort {
  /** Creates the tenant, its first (owner) user, and the owner's tenant-wide membership
   * grant atomically. This is the one legitimate place a repository spans three aggregates
   * (Tenant, User, UserTenantRole) — there is no other way to bootstrap a brand-new tenant's
   * first user, and the operation must be all-or-nothing. */
  abstract createWithOwner(params: CreateTenantWithOwnerParams): Promise<TenantWithOwner>;

  abstract findById(id: string): Promise<Tenant | null>;
  abstract findAll(): Promise<Tenant[]>;
  abstract existsWithSlug(slug: string): Promise<boolean>;
}
