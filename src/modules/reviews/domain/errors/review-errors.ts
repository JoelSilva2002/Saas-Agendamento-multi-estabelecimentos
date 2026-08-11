import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared-kernel/domain/domain-error';

export class AppointmentNotReviewableError extends ValidationError {
  constructor(status: string) {
    super(`Só é possível avaliar um agendamento com status 'completed' (atual: '${status}')`);
  }
}

export class ReviewAccessDeniedError extends ForbiddenError {
  constructor() {
    super('Este agendamento não pertence a você');
  }
}

/** Backstop for Review.appointmentId's unique constraint — one review per appointment. */
export class AppointmentAlreadyReviewedError extends ConflictError {
  constructor() {
    super('Este agendamento já foi avaliado');
  }
}

export class ReviewNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Avaliação '${id}' não encontrada`);
  }
}
