import { Injectable } from '@nestjs/common';
import { PaymentRepositoryPort } from '../../../payments/domain/payment.repository.port';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export interface MonthlyRevenue {
  month: string;
  revenueCents: number;
}

const MONTH_REGEX = /^\d{4}-\d{2}$/;

@Injectable()
export class GetMonthlyRevenueUseCase {
  constructor(private readonly paymentRepository: PaymentRepositoryPort) {}

  async execute(establishmentId: string, month: string): Promise<MonthlyRevenue> {
    if (!MONTH_REGEX.test(month)) {
      throw new ValidationError('month deve estar no formato YYYY-MM');
    }

    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const nextMonthStart = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1),
    );

    const revenueCents = await this.paymentRepository.sumPaidAmountBetween(
      establishmentId,
      monthStart,
      nextMonthStart,
    );
    return { month, revenueCents };
  }
}
