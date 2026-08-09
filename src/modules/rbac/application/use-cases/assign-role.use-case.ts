import { Injectable } from '@nestjs/common';
import { RoleRepositoryPort } from '../../domain/role.repository.port';
import { MembershipRepositoryPort } from '../../domain/membership.repository.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { RoleNotFoundError, EstablishmentNotInTenantError } from '../../domain/errors/rbac-errors';
import { Membership } from '../../domain/entities/membership.entity';

export interface AssignRoleInput {
  userId: string;
  tenantId: string;
  roleId: string;
  establishmentId?: string;
}

@Injectable()
export class AssignRoleUseCase {
  constructor(
    private readonly roleRepository: RoleRepositoryPort,
    private readonly membershipRepository: MembershipRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
  ) {}

  async execute(input: AssignRoleInput): Promise<Membership> {
    const role = await this.roleRepository.findById(input.roleId);
    if (!role) {
      throw new RoleNotFoundError(input.roleId);
    }

    if (input.establishmentId) {
      const belongsToTenant = await this.establishmentRepository.existsInTenant(
        input.establishmentId,
        input.tenantId,
      );
      if (!belongsToTenant) {
        throw new EstablishmentNotInTenantError(input.establishmentId, input.tenantId);
      }
    }

    return this.membershipRepository.replaceGrant({
      userId: input.userId,
      tenantId: input.tenantId,
      establishmentId: input.establishmentId ?? null,
      roleId: input.roleId,
    });
  }
}
