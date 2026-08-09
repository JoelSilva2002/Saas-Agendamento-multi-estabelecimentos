import { Permission } from './entities/permission.entity';

export abstract class PermissionRepositoryPort {
  abstract findAll(): Promise<Permission[]>;
}
