import { randomBytes, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../domain/user.repository.port';
import { User } from '../../domain/entities/user.entity';
import { UserAlreadyMemberError } from '../../domain/errors/user-errors';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import { AssignRoleUseCase } from '../../../rbac/application/use-cases/assign-role.use-case';

export interface InviteUserInput {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  establishmentId?: string;
}

export interface InviteUserOutput {
  user: User;
  /** Only present when a brand-new user account was created — undefined when an existing
   * user was simply granted membership in a new tenant. This is a Phase 1 stub: real
   * invite-by-email is out of scope until the notifications system exists (Phase 3+). */
  temporaryPassword?: string;
}

@Injectable()
export class InviteUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly assignRoleUseCase: AssignRoleUseCase,
  ) {}

  async execute(input: InviteUserInput): Promise<InviteUserOutput> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      const alreadyMember = await this.userRepository.existsInTenant(existingUser.id, input.tenantId);
      if (alreadyMember) {
        throw new UserAlreadyMemberError(normalizedEmail);
      }

      await this.assignRoleUseCase.execute({
        userId: existingUser.id,
        tenantId: input.tenantId,
        roleId: input.roleId,
        establishmentId: input.establishmentId,
      });

      return { user: existingUser };
    }

    const temporaryPassword = randomBytes(9).toString('base64url');
    const passwordHash = await this.passwordHasher.hash(temporaryPassword);

    const newUser = User.create({
      id: randomUUID(),
      email: normalizedEmail,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    const createdUser = await this.userRepository.create(newUser);

    await this.assignRoleUseCase.execute({
      userId: createdUser.id,
      tenantId: input.tenantId,
      roleId: input.roleId,
      establishmentId: input.establishmentId,
    });

    return { user: createdUser, temporaryPassword };
  }
}
