export interface ImpersonationSession {
  id: string;
  platformAdminUserId: string;
  tenantId: string;
  impersonatedUserId: string;
  startedAt: Date;
  endedAt: Date | null;
}

export interface CreateImpersonationSessionParams {
  id: string;
  platformAdminUserId: string;
  tenantId: string;
  impersonatedUserId: string;
}

/** Audit trail for SuperAdmin "support access" — see ImpersonateTenantUseCase. Deliberately a
 * thin record type rather than a full DDD entity: this is an append-mostly log, not a domain
 * aggregate with invariants to protect. */
export abstract class ImpersonationSessionRepositoryPort {
  abstract create(params: CreateImpersonationSessionParams): Promise<ImpersonationSession>;
  abstract findById(id: string): Promise<ImpersonationSession | null>;
  abstract end(id: string, endedAt: Date): Promise<void>;
}
