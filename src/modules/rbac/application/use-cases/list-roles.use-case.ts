import { Injectable } from '@nestjs/common';
import { RoleRepositoryPort } from '../../domain/role.repository.port';
import { Role } from '../../domain/entities/role.entity';

@Injectable()
export class ListRolesUseCase {
  constructor(private readonly roleRepository: RoleRepositoryPort) {}

  async execute(): Promise<Role[]> {
    return this.roleRepository.findAll();
  }
}
