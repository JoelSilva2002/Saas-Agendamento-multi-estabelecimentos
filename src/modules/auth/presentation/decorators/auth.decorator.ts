import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantScopeGuard } from '../guards/tenant-scope.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from './require-permission.decorator';

/**
 * Composes the full tenant-scoped auth chain: JwtAuthGuard -> TenantScopeGuard ->
 * PermissionsGuard, plus the @RequirePermission metadata the last guard reads.
 * Use on any route nested under /tenants/:tenantId that requires a specific permission.
 */
export const Auth = (permissionKey: string): MethodDecorator =>
  applyDecorators(
    UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard),
    RequirePermission(permissionKey),
  );
