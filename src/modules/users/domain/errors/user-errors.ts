import { ConflictError, NotFoundError } from '../../../../shared-kernel/domain/domain-error';

export class UserNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super(`Usuário '${identifier}' não encontrado`);
  }
}

export class DuplicateEmailError extends ConflictError {
  constructor(email: string) {
    super(`Já existe um usuário com o email '${email}'`);
  }
}

export class UserAlreadyMemberError extends ConflictError {
  constructor(email: string) {
    super(`Usuário '${email}' já é membro deste tenant`);
  }
}
