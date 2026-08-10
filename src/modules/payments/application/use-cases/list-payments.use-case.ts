import { Injectable } from '@nestjs/common';
import { ListPaymentsFilters, PaymentRepositoryPort } from '../../domain/payment.repository.port';
import { Payment } from '../../domain/entities/payment.entity';

export interface ListPaymentsInput {
  establishmentId: string;
  filters: ListPaymentsFilters;
}

@Injectable()
export class ListPaymentsUseCase {
  constructor(private readonly paymentRepository: PaymentRepositoryPort) {}

  async execute(input: ListPaymentsInput): Promise<Payment[]> {
    return this.paymentRepository.findMany(input.establishmentId, input.filters);
  }
}
