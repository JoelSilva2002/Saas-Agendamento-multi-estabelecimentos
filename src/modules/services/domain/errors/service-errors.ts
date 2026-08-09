import { ConflictError, NotFoundError, ValidationError } from '../../../../shared-kernel/domain/domain-error';

export class ServiceNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Serviço '${id}' não encontrado`);
  }
}

export class ServiceCategoryNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Categoria de serviço '${id}' não encontrada`);
  }
}

export class DuplicateServiceCategoryNameError extends ConflictError {
  constructor(name: string) {
    super(`Já existe uma categoria chamada '${name}' neste estabelecimento`);
  }
}

export class InvalidServiceEmployeeError extends ValidationError {
  constructor(employeeId: string) {
    super(`Funcionário '${employeeId}' não pertence ao mesmo estabelecimento do serviço`);
  }
}
