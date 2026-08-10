import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared-kernel/domain/domain-error';

export class AppointmentNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Agendamento '${id}' não encontrado`);
  }
}

export class EmployeeNotEligibleForServiceError extends ValidationError {
  constructor(employeeId: string, serviceId: string) {
    super(`Funcionário '${employeeId}' não está habilitado para o serviço '${serviceId}'`);
  }
}

/** Thrown when the requested [startAt, endAt) (plus the service's own buffer) is no longer
 * free — either the pre-check inside the locked transaction found a conflict, or the
 * database's EXCLUDE constraint rejected the insert as a last-resort safety net. */
export class SlotNotAvailableError extends ConflictError {
  constructor() {
    super('O horário solicitado não está mais disponível para este funcionário');
  }
}

export class CancellationReasonRequiredError extends ValidationError {
  constructor() {
    super('O motivo do cancelamento é obrigatório');
  }
}

/** Thrown when a client (not staff) tries to cancel/reschedule with less notice than the
 * establishment's configured minimum. Staff bypasses this check entirely. */
export class CancellationWindowExpiredError extends ConflictError {
  constructor(minHoursNotice: number) {
    super(`Cancelamento/reagendamento requer ao menos ${minHoursNotice}h de antecedência`);
  }
}

/** Thrown when cancel/reschedule/no-show is attempted on an appointment that is already in
 * a terminal status (cancelled/completed/no_show). */
export class InvalidAppointmentStatusTransitionError extends ConflictError {
  constructor(currentStatus: string) {
    super(`Não é possível alterar um agendamento com status '${currentStatus}'`);
  }
}

/** No-show can only be marked once the appointment's scheduled time has actually passed. */
export class AppointmentInFutureError extends ValidationError {
  constructor() {
    super('Não é possível marcar falta em um agendamento que ainda não começou');
  }
}

/** Thrown when a self-service caller (a client acting on their own appointments) targets an
 * appointment that belongs to a different client. */
export class AppointmentAccessDeniedError extends ForbiddenError {
  constructor() {
    super('Este agendamento não pertence a você');
  }
}
