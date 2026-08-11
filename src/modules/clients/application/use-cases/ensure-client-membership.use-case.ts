import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { RoleRepositoryPort } from '../../../rbac/domain/role.repository.port';
import { RoleNotFoundError } from '../../../rbac/domain/errors/rbac-errors';
import { AssignRoleUseCase } from '../../../rbac/application/use-cases/assign-role.use-case';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../../establishments/domain/errors/establishment-errors';
import { ClientProfileRepositoryPort } from '../../domain/client-profile.repository.port';
import { ClientProfile } from '../../domain/entities/client-profile.entity';

const CLIENT_ROLE_NAME = 'client';

export interface EnsureClientMembershipInput {
  userId: string;
  establishmentId: string;
}

/**
 * Attaches an existing user to an establishment as a client: the `client` role grant plus a
 * ClientProfile.
 *
 * An account can now be created with no establishment at all (someone signing up from the
 * login page rather than mid-booking), so the grant that TenantScopeGuard and
 * `appointment:create:own` depend on has to be created the first time they actually book
 * somewhere. Idempotent — booking again at the same place is a no-op.
 */
@Injectable()
export class EnsureClientMembershipUseCase {
  constructor(
    private readonly roleRepository: RoleRepositoryPort,
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly clientProfileRepository: ClientProfileRepositoryPort,
  ) {}

  async execute(input: EnsureClientMembershipInput): Promise<void> {
    const establishment = await this.establishmentRepository.findByIdUnscoped(
      input.establishmentId,
    );
    if (!establishment || establishment.deletedAt) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }

    const clientRole = await this.roleRepository.findByName(CLIENT_ROLE_NAME);
    if (!clientRole) {
      throw new RoleNotFoundError(CLIENT_ROLE_NAME);
    }

    // replaceGrant (inside AssignRoleUseCase) is upsert-like, so re-running is harmless.
    await this.assignRoleUseCase.execute({
      userId: input.userId,
      tenantId: establishment.tenantId,
      roleId: clientRole.id,
      establishmentId: establishment.id,
    });

    const existingProfile = await this.clientProfileRepository.findByUserAndEstablishment(
      input.userId,
      establishment.id,
    );
    if (!existingProfile) {
      await this.clientProfileRepository.create(
        ClientProfile.create({
          id: randomUUID(),
          establishmentId: establishment.id,
          userId: input.userId,
        }),
      );
    }
  }
}
