import { Establishment } from './entities/establishment.entity';

export interface PublicEstablishmentFilters {
  city?: string;
  search?: string;
}

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

  /** Slug uniqueness is platform-wide, not per-tenant: the slug IS the public booking URL. */
  abstract existsWithSlug(slug: string, excludeId?: string): Promise<boolean>;

  /** Public directory lookups — no tenant scoping by design, these back the unauthenticated
   * client-facing pages. Only non-deleted establishments are ever returned. */
  abstract findBySlug(slug: string): Promise<Establishment | null>;

  /** By id, without a tenant filter. Only for callers that already hold a row pointing at this
   * establishment (e.g. a client's own appointment) and just need its public details. */
  abstract findByIdUnscoped(id: string): Promise<Establishment | null>;
  abstract findPublic(filters: PublicEstablishmentFilters): Promise<Establishment[]>;

  /** Distinct cities that currently have at least one establishment, for the search filter. */
  abstract listCities(): Promise<string[]>;

  /** The establishment's IANA zone, without loading the whole aggregate. Deliberately not
   * tenant-scoped: availability is computed from an establishmentId that the caller's guards
   * have already authorised, and the zone name is not sensitive. */
  abstract getTimeZone(establishmentId: string): Promise<string | null>;
}
