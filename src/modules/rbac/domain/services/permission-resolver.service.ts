import { MembershipGrant } from '../entities/membership.entity';

export interface ResolvedTenantContext {
  roleNames: string[];
  permissions: Set<string>;
}

/**
 * Unions tenant-wide grants (establishmentId === null) with grants scoped to the
 * establishment being acted on (if any). A grant scoped to a *different* establishment
 * never contributes permissions — that's the isolation guarantee between sibling
 * establishments in the same tenant.
 */
export class PermissionResolver {
  static resolve(grants: MembershipGrant[], establishmentId?: string): ResolvedTenantContext {
    const applicable = grants.filter(
      (grant) => grant.establishmentId === null || grant.establishmentId === establishmentId,
    );

    const roleNames = new Set<string>();
    const permissions = new Set<string>();

    for (const grant of applicable) {
      roleNames.add(grant.roleName);
      for (const key of grant.permissionKeys) {
        permissions.add(key);
      }
    }

    return { roleNames: [...roleNames], permissions };
  }
}
