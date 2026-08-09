import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../domain/user.repository.port';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class ListTenantUsersUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(tenantId: string): Promise<User[]> {
    return this.userRepository.findAllByTenant(tenantId);
  }
}
