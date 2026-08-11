import { User } from './entities/user.entity';

export abstract class UserRepositoryPort {
  abstract create(user: User): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  /** Does NOT persist passwordHash — use updatePassword for that, so a routine profile edit
   * can never overwrite credentials by accident. */
  abstract update(user: User): Promise<User>;
  abstract updatePassword(userId: string, passwordHash: string): Promise<void>;

  /** Users visible within a tenant — i.e. users with at least one row in user_tenant_roles
   * for that tenant. Users are a global entity, so "list tenant users" is a join, not a
   * tenant_id column filter. */
  abstract findAllByTenant(tenantId: string): Promise<User[]>;

  abstract existsInTenant(userId: string, tenantId: string): Promise<boolean>;
}
