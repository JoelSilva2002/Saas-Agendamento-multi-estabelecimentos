import { GetMonthlyRevenueUseCase } from './get-monthly-revenue.use-case';
import { PaymentRepositoryPort } from '../../../payments/domain/payment.repository.port';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

describe('GetMonthlyRevenueUseCase', () => {
  function build(overrides?: { paymentRepository?: Partial<PaymentRepositoryPort> }) {
    const paymentRepository: PaymentRepositoryPort = {
      sumPaidAmountBetween: jest.fn().mockResolvedValue(50000),
      ...overrides?.paymentRepository,
    } as unknown as PaymentRepositoryPort;

    return { useCase: new GetMonthlyRevenueUseCase(paymentRepository), paymentRepository };
  }

  it('sums paid amounts for the given month', async () => {
    const { useCase, paymentRepository } = build();
    const result = await useCase.execute('establishment-1', '2026-03');

    expect(result).toEqual({ month: '2026-03', revenueCents: 50000 });
    expect(paymentRepository.sumPaidAmountBetween).toHaveBeenCalledWith(
      'establishment-1',
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-04-01T00:00:00.000Z'),
    );
  });

  it('handles a December -> January month rollover', async () => {
    const { useCase, paymentRepository } = build();
    await useCase.execute('establishment-1', '2026-12');

    expect(paymentRepository.sumPaidAmountBetween).toHaveBeenCalledWith(
      'establishment-1',
      new Date('2026-12-01T00:00:00.000Z'),
      new Date('2027-01-01T00:00:00.000Z'),
    );
  });

  it('rejects a malformed month', async () => {
    const { useCase } = build();
    await expect(useCase.execute('establishment-1', '2026-3')).rejects.toThrow(ValidationError);
  });
});
