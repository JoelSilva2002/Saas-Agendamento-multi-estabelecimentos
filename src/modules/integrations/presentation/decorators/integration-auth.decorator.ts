import { applyDecorators, UseGuards } from '@nestjs/common';
import { IntegrationAuthGuard } from '../guards/integration-auth.guard';
import { ApiKeyThrottlerGuard } from '../guards/api-key-throttler.guard';
import { PermissionsGuard } from '../../../auth/presentation/guards/permissions.guard';
import { RequirePermission } from '../../../auth/presentation/decorators/require-permission.decorator';

/**
 * Machine-to-machine equivalent of @Auth() (see auth/presentation/decorators/auth.decorator.ts):
 * IntegrationAuthGuard -> PermissionsGuard -> ApiKeyThrottlerGuard, instead of JwtAuthGuard ->
 * TenantScopeGuard -> PermissionsGuard. Reuses PermissionsGuard unchanged since both guards
 * populate the same request.tenantContext.permissions shape. Throttling runs last (after
 * IntegrationAuthGuard has set request.apiKeyId) and rejects unauthenticated/unauthorized
 * requests before they can ever count against a key's rate budget.
 */
export const IntegrationAuth = (...permissionKeys: string[]): MethodDecorator =>
  applyDecorators(
    UseGuards(IntegrationAuthGuard, PermissionsGuard, ApiKeyThrottlerGuard),
    RequirePermission(...permissionKeys),
  );
