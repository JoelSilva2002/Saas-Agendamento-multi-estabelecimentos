import { ConflictError, NotFoundError } from '../../../../shared-kernel/domain/domain-error';

export class TenantNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Tenant '${id}' não encontrado`);
  }
}

export class DuplicateTenantSlugError extends ConflictError {
  constructor(slug: string) {
    super(`Já existe um tenant com o slug '${slug}'`);
  }
}

export class TenantOwnerNotFoundError extends NotFoundError {
  constructor(tenantId: string) {
    super(`Tenant '${tenantId}' não possui um usuário owner`);
  }
}

export class TenantNotActiveError extends ConflictError {
  constructor(tenantId: string) {
    super(`Tenant '${tenantId}' não está ativo`);
  }
}
