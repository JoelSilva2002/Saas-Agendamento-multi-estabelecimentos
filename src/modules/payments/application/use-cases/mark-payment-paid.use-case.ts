import { Injectable } from '@nestjs/common';
import { PaymentRepositoryPort } from '../../domain/payment.repository.port';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentNotFoundError } from '../../domain/errors/payment-errors';

export interface MarkPaymentPaidInput {
  establishmentId: string;
  paymentId: string;
}

@Injectable()
export class MarkPaymentPaidUseCase {
  constructor(private readonly paymentRepository: PaymentRepositoryPort) {}

  async execute(input: MarkPaymentPaidInput): Promise<Payment> {
    const payment = await this.paymentRepository.findById(input.paymentId, input.establishmentId);
    if (!payment) {
      throw new PaymentNotFoundError(input.paymentId);
    }

    return this.paymentRepository.update(payment.markPaid());
  }
}
