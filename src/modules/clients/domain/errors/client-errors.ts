import { NotFoundError } from '../../../../shared-kernel/domain/domain-error';

export class ClientProfileNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Cliente '${id}' não encontrado`);
  }
}
