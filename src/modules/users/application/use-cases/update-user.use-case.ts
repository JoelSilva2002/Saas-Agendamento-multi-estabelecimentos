import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../domain/user.repository.port';
import { User } from '../../domain/entities/user.entity';
import { UserNotFoundError } from '../../domain/errors/user-errors';

export interface UpdateUserInput {
  tenantId: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(input: UpdateUserInput): Promise<User> {
    const belongsToTenant = await this.userRepository.existsInTenant(input.userId, input.tenantId);
    if (!belongsToTenant) {
      throw new UserNotFoundError(input.userId);
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    const updated = user.update({
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: input.isActive,
    });

    return this.userRepository.update(updated);
  }
}
