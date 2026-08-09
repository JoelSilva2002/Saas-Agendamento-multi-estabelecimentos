import { Establishment } from './entities/establishment.entity';

export abstract class EstablishmentRepositoryPort {
  abstract create(establishment: Establishment): Promise<Establishment>;

  /** Always scoped by tenantId — the repository-level second layer of tenant isolation. */
  abstract findById(id: string, tenantId: string): Promise<Establishment | null>;

  /** Existence check without loading the full entity — used by other modules (e.g. RBAC's
   * AssignRoleUseCase) to validate an establishmentId belongs to a tenant. */
  abstract existsInTenant(id: string, tenantId: string): Promise<boolean>;

  abstract findAllByTenant(tenantId: string): Promise<Establishment[]>;

  abstract update(establishment: Establishment): Promise<Establishment>;

  abstract softDelete(id: string, tenantId: string): Promise<void>;

  abstract existsWithSlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
}
