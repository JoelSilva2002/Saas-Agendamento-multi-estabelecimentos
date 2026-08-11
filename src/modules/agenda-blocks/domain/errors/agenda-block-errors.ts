import { NotFoundError } from '../../../../shared-kernel/domain/domain-error';

export class AgendaBlockNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Bloqueio '${id}' não encontrado`);
  }
}
