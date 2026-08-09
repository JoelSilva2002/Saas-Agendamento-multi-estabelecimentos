import { PermissionResolver } from './permission-resolver.service';
import { MembershipGrant } from '../entities/membership.entity';

describe('PermissionResolver', () => {
  it('grants permissions from a tenant-wide role for any establishment', () => {
    const grants: MembershipGrant[] = [
      { establishmentId: null, roleName: 'owner', permissionKeys: ['establishment:create'] },
    ];
    const resolved = PermissionResolver.resolve(grants, 'establishment-A');
    expect(resolved.permissions.has('establishment:create')).toBe(true);
    expect(resolved.roleNames).toContain('owner');
  });

  it('grants establishment-scoped permissions only for that establishment', () => {
    const grants: MembershipGrant[] = [
      { establishmentId: 'establishment-A', roleName: 'employee', permissionKeys: ['establishment:read'] },
    ];
    expect(PermissionResolver.resolve(grants, 'establishment-A').permissions.has('establishment:read')).toBe(true);
    expect(PermissionResolver.resolve(grants, 'establishment-B').permissions.has('establishment:read')).toBe(false);
  });

  it('does not leak establishment-scoped permissions when no establishment is targeted', () => {
    const grants: MembershipGrant[] = [
      { establishmentId: 'establishment-A', roleName: 'employee', permissionKeys: ['establishment:read'] },
    ];
    const resolved = PermissionResolver.resolve(grants, undefined);
    expect(resolved.permissions.size).toBe(0);
  });

  it('unions permissions across multiple roles held by the same user', () => {
    const grants: MembershipGrant[] = [
      { establishmentId: null, roleName: 'manager', permissionKeys: ['establishment:read'] },
      { establishmentId: 'establishment-A', roleName: 'employee', permissionKeys: ['establishment:update'] },
    ];
    const resolved = PermissionResolver.resolve(grants, 'establishment-A');
    expect(resolved.permissions.has('establishment:read')).toBe(true);
    expect(resolved.permissions.has('establishment:update')).toBe(true);
    expect(resolved.roleNames.sort()).toEqual(['employee', 'manager']);
  });
});
