import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { VerifyApiKeyUseCase } from '../../../api-keys/application/use-cases/verify-api-key.use-case';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';

const BEARER_PREFIX = 'Bearer ';

// Machine-to-machine equivalent of TenantScopeGuard (see auth/presentation/guards/tenant-scope.guard.ts):
// authenticates via an ApiKey instead of a JWT, and populates the exact same
// request.tenantContext / request.user shapes so that every downstream guard
// (PermissionsGuard) and use case that today only knows about staff/client sessions works
// completely unchanged for integration callers.
@Injectable()
export class IntegrationAuthGuard implements CanActivate {
  constructor(
    private readonly verifyApiKey: VerifyApiKeyUseCase,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const header = request.headers.authorization;
    if (!header || !header.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException();
    }
    const rawKey = header.slice(BEARER_PREFIX.length).trim();

    const apiKey = await this.verifyApiKey.execute(rawKey);
    if (!apiKey) {
      throw new UnauthorizedException();
    }

    // Establishment resolution has no :tenantId in the URL to validate against — the API key
    // itself carries establishment scope (decided: keys are per-establishment, not per-tenant),
    // so tenantId is derived by looking the establishment up directly.
    const establishment = await this.establishmentRepository.findByIdUnscoped(apiKey.establishmentId);
    if (!establishment) {
      throw new UnauthorizedException();
    }

    request.user = {
      id: apiKey.createdById,
      email: null,
      isPlatformAdmin: false,
    };
    request.tenantContext = {
      tenantId: establishment.tenantId,
      establishmentId: apiKey.establishmentId,
      roleNames: [],
      permissions: new Set(apiKey.scopes),
    };
    request.apiKeyId = apiKey.id;

    return true;
  }
}
