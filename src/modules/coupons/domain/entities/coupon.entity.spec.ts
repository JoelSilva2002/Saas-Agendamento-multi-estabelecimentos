import { Coupon } from './coupon.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';
import { CouponInvalidError } from '../errors/coupon-errors';

function buildCoupon(overrides?: Partial<Parameters<typeof Coupon.create>[0]>): Coupon {
  return Coupon.create({
    id: 'coupon-1',
    tenantId: 'tenant-1',
    code: 'promo10',
    discountType: 'percentage',
    discountValue: 10,
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    validUntil: new Date('2026-12-31T00:00:00.000Z'),
    ...overrides,
  });
}

describe('Coupon', () => {
  it('creates an active coupon, uppercasing the code', () => {
    const coupon = buildCoupon();
    expect(coupon.code).toBe('PROMO10');
    expect(coupon.status).toBe('active');
    expect(coupon.usedCount).toBe(0);
  });

  it('rejects validFrom after validUntil', () => {
    expect(() =>
      buildCoupon({
        validFrom: new Date('2026-12-31T00:00:00.000Z'),
        validUntil: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toThrow(ValidationError);
  });

  it('rejects a percentage discount over 100', () => {
    expect(() => buildCoupon({ discountValue: 150 })).toThrow(ValidationError);
  });

  it('rejects a non-positive discount value', () => {
    expect(() => buildCoupon({ discountValue: 0 })).toThrow(ValidationError);
  });

  describe('computeDiscountCents', () => {
    it('computes a percentage discount', () => {
      const coupon = buildCoupon({ discountType: 'percentage', discountValue: 10 });
      expect(coupon.computeDiscountCents(10000)).toBe(1000);
    });

    it('computes a fixed-amount discount (reais -> cents)', () => {
      const coupon = buildCoupon({ discountType: 'fixed_amount', discountValue: 15 });
      expect(coupon.computeDiscountCents(10000)).toBe(1500);
    });

    it('never discounts more than the amount itself', () => {
      const coupon = buildCoupon({ discountType: 'fixed_amount', discountValue: 500 });
      expect(coupon.computeDiscountCents(10000)).toBe(10000);
    });
  });

  describe('assertRedeemable', () => {
    it('passes for an active coupon within its window and usage cap', () => {
      const coupon = buildCoupon({ maxUses: 5 });
      expect(() =>
        coupon.assertRedeemable(10000, new Date('2026-06-01T00:00:00.000Z')),
      ).not.toThrow();
    });

    it('rejects an inactive coupon', () => {
      const coupon = buildCoupon().update({ status: 'inactive' });
      expect(() => coupon.assertRedeemable(10000)).toThrow(CouponInvalidError);
    });

    it('rejects outside the validity window', () => {
      const coupon = buildCoupon();
      expect(() => coupon.assertRedeemable(10000, new Date('2025-01-01T00:00:00.000Z'))).toThrow(
        CouponInvalidError,
      );
    });

    it('rejects below the minimum purchase', () => {
      const coupon = buildCoupon({ minPurchaseCents: 5000 });
      expect(() => coupon.assertRedeemable(1000, new Date('2026-06-01T00:00:00.000Z'))).toThrow(
        CouponInvalidError,
      );
    });
  });

  describe('update', () => {
    it('disabling via status does not require re-validating discountValue changes', () => {
      const coupon = buildCoupon();
      const updated = coupon.update({ status: 'inactive' });
      expect(updated.status).toBe('inactive');
    });
  });

  describe('deactivate', () => {
    it('sets status to inactive', () => {
      const coupon = buildCoupon();
      expect(coupon.deactivate().status).toBe('inactive');
    });
  });
});
