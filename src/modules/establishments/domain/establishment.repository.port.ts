import { Establishment } from './entities/establishment.entity';

export abstract class EstablishmentRepositoryPort {
  abstract create(establishment: Establishment): Promise<Establishment>;

  /** Always scoped by tenantId — the repository-level second layer of tenant isolation. */
  abstract findById(id: string, tenantId: string): Promise<Establishment | null>;

  /** Existence check without loading the full entity — used by other modules (e.g. RBAC's
   * AssignRoleUseCase) to validate an establishmentId belongs to a tenant. */
  abstract existsInTenant(id: string, tenantId: string): Promise<boolean>;

  abstract findAllByTenant(tenantId: string): Promise<Establishment[]>;

  /** Every non-deleted establishment across every tenant — used by the reminders cron
   * (notifications module) to scan all establishments' upcoming appointments. Nothing else
   * in the system needs a cross-tenant listing; keep this method scoped to that one use. */
  abstract findAllActive(): Promise<Establishment[]>;

  abstract update(establishment: Establishment): Promise<Establishment>;

  abstract softDelete(id: string, tenantId: string): Promise<void>;

  abstract existsWithSlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
}
