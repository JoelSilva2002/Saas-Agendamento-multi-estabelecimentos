import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../../shared-kernel/domain/domain-error';

export class PaymentNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Pagamento '${id}' não encontrado`);
  }
}

export class DepositNotConfiguredError extends ValidationError {
  constructor() {
    super('Este estabelecimento não tem sinal/depósito configurado');
  }
}

export class AppointmentNotPayableError extends ConflictError {
  constructor(status: string) {
    super(`Não é possível criar um pagamento para um agendamento com status '${status}'`);
  }
}

export class InvalidWebhookSecretError extends UnauthorizedError {
  constructor() {
    super('Segredo de webhook inválido');
  }
}

export class PaymentGatewayError extends ConflictError {
  constructor(message: string) {
    super(`Falha ao comunicar com o gateway de pagamento: ${message}`);
  }
}
