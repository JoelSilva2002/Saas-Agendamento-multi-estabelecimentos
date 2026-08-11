import { Membership, MembershipGrant } from './entities/membership.entity';

export interface CreateMembershipParams {
  userId: string;
  tenantId: string;
  establishmentId: string | null;
  roleId: string;
}

export abstract class MembershipRepositoryPort {
  /** All role grants (tenant-wide and establishment-scoped) a user holds within a tenant,
   * enriched with role name and permission keys, ready for PermissionResolver. */
  abstract findGrantsForUserInTenant(userId: string, tenantId: string): Promise<MembershipGrant[]>;

  abstract create(params: CreateMembershipParams): Promise<Membership>;

  abstract existsTenantWide(userId: string, tenantId: string, roleId: string): Promise<boolean>;

  abstract existsForEstablishment(
    userId: string,
    tenantId: string,
    establishmentId: string,
    roleId: string,
  ): Promise<boolean>;

  /** Replaces every existing grant a user has within a tenant (optionally scoped to one
   * establishment) with a single new grant — used by "change this user's role" operations. */
  abstract replaceGrant(params: CreateMembershipParams): Promise<Membership>;

  /** Every membership a user holds across all tenants — used by GET /auth/me to show which
   * tenants/establishments a user belongs to and with which role. */
  abstract findAllGrantsForUser(
    userId: string,
  ): Promise<Array<{ tenantId: string; establishmentId: string | null; roleName: string }>>;

  /** The tenant-wide 'owner' grant for a tenant, if any — used by SuperAdmin impersonation to
   * find who to "become" when support-accessing a tenant (see ImpersonateTenantUseCase). */
  abstract findTenantOwner(tenantId: string): Promise<{ userId: string } | null>;
}
