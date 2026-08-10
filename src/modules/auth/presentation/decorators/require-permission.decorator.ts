import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';
/** Stored as an array so PermissionsGuard can check OR-semantics (caller needs ANY one of
 * the listed permissions) — a single key is just an array of length one. */
export const RequirePermission = (...permissionKeys: string[]): MethodDecorator =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permissionKeys);
