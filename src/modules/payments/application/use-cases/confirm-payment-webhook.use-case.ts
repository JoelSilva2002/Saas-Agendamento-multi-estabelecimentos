import { Injectable } from '@nestjs/common';
import { PaymentRepositoryPort } from '../../domain/payment.repository.port';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentNotFoundError } from '../../domain/errors/payment-errors';

export interface ConfirmPaymentWebhookInput {
  externalReference: string;
  status: 'paid' | 'failed';
}

@Injectable()
export class ConfirmPaymentWebhookUseCase {
  constructor(private readonly paymentRepository: PaymentRepositoryPort) {}

  async execute(input: ConfirmPaymentWebhookInput): Promise<Payment> {
    const payment = await this.paymentRepository.findByExternalReference(input.externalReference);
    if (!payment) {
      throw new PaymentNotFoundError(input.externalReference);
    }

    const updated = input.status === 'paid' ? payment.markPaid() : payment.markFailed();
    return this.paymentRepository.update(updated);
  }
}
