import { ForbiddenError, UnauthorizedError, ValidationError } from '../../../../shared-kernel/domain/domain-error';

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

/** 400, not 401: the same "don't trip the session-expired interceptor" reasoning as above
 * applies here too — a stale access token sitting in localStorage from a previous session must
 * never turn a bad/expired reset link into an unwanted redirect to /login. */
export class InvalidOrExpiredResetTokenError extends ValidationError {
  constructor() {
    super('Link de redefinição de senha inválido ou expirado');
  }
}
