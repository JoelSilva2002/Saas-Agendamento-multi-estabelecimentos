import { ValidateCouponUseCase } from './validate-coupon.use-case';
import { CouponRepositoryPort } from '../../domain/coupon.repository.port';
import { Coupon } from '../../domain/entities/coupon.entity';
import { CouponInvalidError, CouponNotFoundError } from '../../domain/errors/coupon-errors';

describe('ValidateCouponUseCase', () => {
  function buildCoupon(overrides?: Partial<Parameters<typeof Coupon.create>[0]>): Coupon {
    return Coupon.create({
      id: 'coupon-1',
      tenantId: 'tenant-1',
      code: 'PROMO10',
      discountType: 'percentage',
      discountValue: 10,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validUntil: new Date('2026-12-31T00:00:00.000Z'),
      ...overrides,
    });
  }

  function build(overrides?: { couponRepository?: Partial<CouponRepositoryPort> }) {
    const couponRepository: CouponRepositoryPort = {
      findByCode: jest.fn().mockResolvedValue(buildCoupon()),
      ...overrides?.couponRepository,
    } as unknown as CouponRepositoryPort;

    return { useCase: new ValidateCouponUseCase(couponRepository) };
  }

  const baseInput = {
    tenantId: 'tenant-1',
    establishmentId: 'establishment-1',
    code: 'PROMO10',
    amountCents: 10000,
  };

  it('returns the couponId and computed discount', async () => {
    const { useCase } = build();
    const result = await useCase.execute(baseInput);
    expect(result).toEqual({ couponId: 'coupon-1', discountCents: 1000 });
  });

  it('throws CouponNotFoundError when the code does not exist', async () => {
    const { useCase } = build({
      couponRepository: { findByCode: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(CouponNotFoundError);
  });

  it('throws CouponInvalidError when the coupon is scoped to a different establishment', async () => {
    const { useCase } = build({
      couponRepository: {
        findByCode: jest
          .fn()
          .mockResolvedValue(buildCoupon({ establishmentId: 'other-establishment' })),
      },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(CouponInvalidError);
  });

  it('throws CouponInvalidError when the coupon is expired', async () => {
    const { useCase } = build({
      couponRepository: {
        findByCode: jest
          .fn()
          .mockResolvedValue(
            buildCoupon({ validFrom: new Date('2020-01-01'), validUntil: new Date('2020-12-31') }),
          ),
      },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(CouponInvalidError);
  });
});
