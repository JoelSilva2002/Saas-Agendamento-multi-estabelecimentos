import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { DuplicateEmailError } from '../../../users/domain/errors/user-errors';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import { RoleRepositoryPort } from '../../../rbac/domain/role.repository.port';
import { RoleNotFoundError } from '../../../rbac/domain/errors/rbac-errors';
import { AssignRoleUseCase } from '../../../rbac/application/use-cases/assign-role.use-case';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../../establishments/domain/errors/establishment-errors';
import { ClientProfileRepositoryPort } from '../../domain/client-profile.repository.port';
import { ClientProfile } from '../../domain/entities/client-profile.entity';

const CLIENT_ROLE_NAME = 'client';

export interface RegisterClientInput {
  tenantId: string;
  establishmentId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: Date;
}

export interface RegisterClientOutput {
  user: User;
  clientProfile: ClientProfile;
}

@Injectable()
export class RegisterClientUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly clientProfileRepository: ClientProfileRepositoryPort,
  ) {}

  async execute(input: RegisterClientInput): Promise<RegisterClientOutput> {
    const establishment = await this.establishmentRepository.findById(input.establishmentId, input.tenantId);
    if (!establishment || establishment.deletedAt) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }

    const normalizedEmail = input.email.toLowerCase().trim();

    // Unlike InviteUserUseCase (called by an already-authenticated admin acting on behalf
    // of the org), this endpoint is public and unauthenticated — silently reusing an
    // existing account here would let anyone set a new password for someone else's email.
    // If the email is already registered, the caller must log in instead.
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new DuplicateEmailError(normalizedEmail);
    }

    const clientRole = await this.roleRepository.findByName(CLIENT_ROLE_NAME);
    if (!clientRole) {
      throw new RoleNotFoundError(CLIENT_ROLE_NAME);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
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
      roleId: clientRole.id,
      establishmentId: input.establishmentId,
    });

    const clientProfile = ClientProfile.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      userId: createdUser.id,
      phone: input.phone,
      birthDate: input.birthDate,
    });
    const createdProfile = await this.clientProfileRepository.create(clientProfile);

    return { user: createdUser, clientProfile: createdProfile };
  }
}
