import { Injectable } from '@nestjs/common';
import { PermissionRepositoryPort } from '../../domain/permission.repository.port';
import { Permission } from '../../domain/entities/permission.entity';

@Injectable()
export class ListPermissionsUseCase {
  constructor(private readonly permissionRepository: PermissionRepositoryPort) {}

  async execute(): Promise<Permission[]> {
    return this.permissionRepository.findAll();
  }
}
