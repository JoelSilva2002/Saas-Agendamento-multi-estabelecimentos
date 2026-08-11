import { ForbiddenError, UnauthorizedError } from '../../../../shared-kernel/domain/domain-error';

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

/** 403, not 401: the caller IS authenticated — they just failed the re-authentication step of
 * a password change. A 401 here would trip the frontend's token-refresh interceptor, which
 * treats 401 as "session expired". */
export class WrongCurrentPasswordError extends ForbiddenError {
  constructor() {
    super('A senha atual está incorreta');
  }
}
