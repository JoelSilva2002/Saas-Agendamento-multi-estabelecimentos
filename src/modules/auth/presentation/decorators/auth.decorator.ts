import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantScopeGuard } from '../guards/tenant-scope.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from './require-permission.decorator';

/**
 * Composes the full tenant-scoped auth chain: JwtAuthGuard -> TenantScopeGuard ->
 * PermissionsGuard, plus the @RequirePermission metadata the last guard reads.
 * Use on any route nested under /tenants/:tenantId that requires a specific permission.
 *
 * Accepts multiple permission keys with OR semantics — e.g.
 * `Auth('appointment:update', 'appointment:cancel:own')` allows either staff (broad
 * permission) or a client acting on their own resource (`:own` permission) to call the same
 * route; the handler itself decides which case it's in via @CurrentTenant().permissions.
 */
export const Auth = (...permissionKeys: string[]): MethodDecorator =>
  applyDecorators(
    UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard),
    RequirePermission(...permissionKeys),
  );
