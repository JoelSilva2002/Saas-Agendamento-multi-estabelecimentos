import { ConflictError, NotFoundError, ValidationError } from '../../../../shared-kernel/domain/domain-error';

export class EmployeeNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Funcionário '${id}' não encontrado`);
  }
}

export class EmployeeTimeOffNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Registro de folga/férias '${id}' não encontrado`);
  }
}

export class UserNotMemberOfEstablishmentError extends ValidationError {
  constructor(userId: string, establishmentId: string) {
    super(`Usuário '${userId}' não é membro do estabelecimento '${establishmentId}' — convide-o antes de criar o perfil de funcionário`);
  }
}

export class DuplicateEmployeeProfileError extends ConflictError {
  constructor() {
    super('Este usuário já possui um perfil de funcionário neste estabelecimento');
  }
}

export class OverlappingScheduleSlotError extends ValidationError {
  constructor(weekday: number) {
    super(`Slots do mesmo tipo (jornada ou intervalo) se sobrepõem no dia da semana '${weekday}'`);
  }
}

export class BreakOutsideWorkingHoursError extends ValidationError {
  constructor(weekday: number) {
    super(`Intervalo fora do horário de trabalho no dia da semana '${weekday}'`);
  }
}
