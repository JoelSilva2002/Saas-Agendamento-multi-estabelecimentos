import { Role } from './entities/role.entity';

export abstract class RoleRepositoryPort {
  abstract findById(id: string): Promise<Role | null>;
  abstract findByName(name: string): Promise<Role | null>;
  abstract findAll(): Promise<Role[]>;
}
