import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../domain/user.repository.port';
import { UserNotFoundError } from '../../domain/errors/user-errors';
import { AssignRoleUseCase } from '../../../rbac/application/use-cases/assign-role.use-case';
import { Membership } from '../../../rbac/domain/entities/membership.entity';

export interface UpdateUserRoleInput {
  tenantId: string;
  userId: string;
  roleId: string;
  establishmentId?: string;
}

/** Thin wrapper that validates the target user belongs to the tenant before delegating to
 * RBAC's AssignRoleUseCase — keeps user-existence checks in the Users module rather than
 * making the generic RBAC module aware of the Users module (would create a circular
 * module dependency, since Users already depends on Rbac for AssignRoleUseCase). */
@Injectable()
export class UpdateUserRoleUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly assignRoleUseCase: AssignRoleUseCase,
  ) {}

  async execute(input: UpdateUserRoleInput): Promise<Membership> {
    const belongsToTenant = await this.userRepository.existsInTenant(input.userId, input.tenantId);
    if (!belongsToTenant) {
      throw new UserNotFoundError(input.userId);
    }

    return this.assignRoleUseCase.execute({
      userId: input.userId,
      tenantId: input.tenantId,
      roleId: input.roleId,
      establishmentId: input.establishmentId,
    });
  }
}
