import { UnauthorizedError } from '../../../../shared-kernel/domain/domain-error';

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Email ou senha inválidos');
  }
}

export class InactiveUserError extends UnauthorizedError {
  constructor() {
    super('Usuário inativo');
  }
}

export class InvalidRefreshTokenError extends UnauthorizedError {
  constructor() {
    super('Refresh token inválido ou expirado');
  }
}
