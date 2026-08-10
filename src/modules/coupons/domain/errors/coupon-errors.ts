import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared-kernel/domain/domain-error';

export class CouponNotFoundError extends NotFoundError {
  constructor(codeOrId: string) {
    super(`Cupom '${codeOrId}' não encontrado`);
  }
}

export class DuplicateCouponCodeError extends ConflictError {
  constructor(code: string) {
    super(`Já existe um cupom com o código '${code}' neste tenant`);
  }
}

export class CouponInvalidError extends ValidationError {
  constructor(reason: string) {
    super(`Cupom inválido: ${reason}`);
  }
}

/** Backstop for the race where two concurrent redemptions both pass the pre-check — the
 * transactional re-check inside CouponRepositoryPort.redeem is the real source of truth. */
export class CouponExhaustedError extends ConflictError {
  constructor() {
    super('Este cupom já atingiu o limite de usos');
  }
}

/** CouponRedemption.appointmentId is unique — one redeemed coupon per appointment, ever. */
export class CouponAlreadyRedeemedForAppointmentError extends ConflictError {
  constructor() {
    super('Já existe um cupom resgatado para este agendamento');
  }
}
