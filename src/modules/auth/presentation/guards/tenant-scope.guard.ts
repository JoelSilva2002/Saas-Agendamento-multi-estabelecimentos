import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { MembershipRepositoryPort } from '../../../rbac/domain/membership.repository.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { PermissionResolver } from '../../../rbac/domain/services/permission-resolver.service';

/**
 * Resolves req.tenantContext for every tenant-scoped route (anything nested under
 * /tenants/:tenantId). This is the core multi-tenant security boundary:
 *
 *  - If the caller has NO membership row for :tenantId at all, respond 404 (not 403) so a
 *    user from tenant A cannot distinguish "tenant B doesn't exist" from "it exists but I
 *    can't see it" — the standard IDOR defense for multi-tenant APIs.
 *  - establishmentId is read from the route param (resource being addressed) or, failing
 *    that, from the request body (e.g. "assign this role scoped to establishment X") — and
 *    is validated to belong to :tenantId before anything else runs.
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(
    private readonly membershipRepository: MembershipRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    const tenantId = this.asSingleParam(request.params.tenantId);
    if (!tenantId) {
      throw new Error('TenantScopeGuard aplicado a uma rota sem :tenantId — verifique o controller');
    }

    const establishmentId: string | undefined =
      this.asSingleParam(request.params.establishmentId) ??
      (request.body as { establishmentId?: string } | undefined)?.establishmentId;

    if (establishmentId) {
      const belongsToTenant = await this.establishmentRepository.existsInTenant(establishmentId, tenantId);
      if (!belongsToTenant) {
        throw new NotFoundException();
      }
    }

    const grants = await this.membershipRepository.findGrantsForUserInTenant(request.user.id, tenantId);
    if (grants.length === 0) {
      throw new NotFoundException();
    }

    const resolved = PermissionResolver.resolve(grants, establishmentId);
    request.tenantContext = {
      tenantId,
      establishmentId,
      roleNames: resolved.roleNames,
      permissions: resolved.permissions,
    };

    return true;
  }

  private asSingleParam(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
