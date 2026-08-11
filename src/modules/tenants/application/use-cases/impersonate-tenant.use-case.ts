import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { TenantRepositoryPort } from '../../domain/tenant.repository.port';
import { TenantNotActiveError, TenantNotFoundError, TenantOwnerNotFoundError } from '../../domain/errors/tenant-errors';
import { ImpersonationSessionRepositoryPort } from '../../domain/impersonation-session.repository.port';
import { MembershipRepositoryPort } from '../../../rbac/domain/membership.repository.port';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { InactiveUserError } from '../../../auth/domain/errors/auth-errors';
import { TokenServicePort } from '../../../auth/application/ports/token-service.port';

export interface ImpersonateTenantInput {
  platformAdminUserId: string;
  tenantId: string;
}

export interface ImpersonateTenantOutput {
  accessToken: string;
  sessionId: string;
  user: { id: string; email: string; firstName: string; lastName: string };
  tenant: { id: string; name: string; slug: string };
}

/** Grants a platform admin "support access" to a tenant without ever seeing/asking for the
 * client's password: it signs a normal access token for the tenant's owner user (the exact
 * mechanism LoginUseCase uses), so every downstream guard/permission check behaves as if the
 * owner logged in themselves. Deliberately issues NO refresh token — the session can't outlive
 * the short access-token expiry, unlike a real login. Every call is recorded in
 * impersonation_sessions for audit. */
@Injectable()
export class ImpersonateTenantUseCase {
  constructor(
    private readonly tenantRepository: TenantRepositoryPort,
    private readonly membershipRepository: MembershipRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly tokenService: TokenServicePort,
    private readonly impersonationSessionRepository: ImpersonationSessionRepositoryPort,
  ) {}

  async execute(input: ImpersonateTenantInput): Promise<ImpersonateTenantOutput> {
    const tenant = await this.tenantRepository.findById(input.tenantId);
    if (!tenant) {
      throw new TenantNotFoundError(input.tenantId);
    }
    if (tenant.status !== 'active') {
      throw new TenantNotActiveError(tenant.id);
    }

    const owner = await this.membershipRepository.findTenantOwner(tenant.id);
    if (!owner) {
      throw new TenantOwnerNotFoundError(tenant.id);
    }

    const user = await this.userRepository.findById(owner.userId);
    if (!user || !user.isActive) {
      throw new InactiveUserError();
    }

    const accessToken = this.tokenService.signAccessToken({ sub: user.id, email: user.email });

    const session = await this.impersonationSessionRepository.create({
      id: randomUUID(),
      platformAdminUserId: input.platformAdminUserId,
      tenantId: tenant.id,
      impersonatedUserId: user.id,
    });

    return {
      accessToken,
      sessionId: session.id,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    };
  }
}
