import { ConflictError, NotFoundError } from '../../../../shared-kernel/domain/domain-error';

export class EstablishmentNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Establishment '${id}' não encontrado`);
  }
}

export class DuplicateEstablishmentSlugError extends ConflictError {
  constructor(slug: string) {
    super(`Já existe um estabelecimento com o slug '${slug}' neste tenant`);
  }
}
