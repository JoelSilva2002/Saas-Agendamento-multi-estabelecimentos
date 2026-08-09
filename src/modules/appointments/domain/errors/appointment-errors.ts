import { ConflictError, NotFoundError, ValidationError } from '../../../../shared-kernel/domain/domain-error';

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
