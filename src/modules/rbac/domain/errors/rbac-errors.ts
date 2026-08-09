import { ConflictError, NotFoundError, ValidationError } from '../../../../shared-kernel/domain/domain-error';

export class RoleNotFoundError extends NotFoundError {
  constructor(roleId: string) {
    super(`Role '${roleId}' não encontrado`);
  }
}

export class PermissionNotFoundError extends NotFoundError {
  constructor(key: string) {
    super(`Permission '${key}' não encontrada`);
  }
}

export class EstablishmentNotInTenantError extends ValidationError {
  constructor(establishmentId: string, tenantId: string) {
    super(`Establishment '${establishmentId}' não pertence ao tenant '${tenantId}'`);
  }
}

export class DuplicateMembershipError extends ConflictError {
  constructor() {
    super('Usuário já possui este papel neste escopo (tenant/estabelecimento)');
  }
}
