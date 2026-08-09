import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../domain/user.repository.port';
import { User } from '../../domain/entities/user.entity';
import { UserNotFoundError } from '../../domain/errors/user-errors';

export interface GetUserInput {
  tenantId: string;
  userId: string;
}

@Injectable()
export class GetUserUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(input: GetUserInput): Promise<User> {
    const belongsToTenant = await this.userRepository.existsInTenant(input.userId, input.tenantId);
    if (!belongsToTenant) {
      throw new UserNotFoundError(input.userId);
    }
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }
    return user;
  }
}
