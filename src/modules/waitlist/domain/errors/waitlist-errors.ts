import { ForbiddenError, NotFoundError } from '../../../../shared-kernel/domain/domain-error';

export class WaitlistEntryNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Entrada '${id}' da lista de espera não encontrada`);
  }
}

export class WaitlistEntryAccessDeniedError extends ForbiddenError {
  constructor() {
    super('Esta entrada da lista de espera não pertence a você');
  }
}
