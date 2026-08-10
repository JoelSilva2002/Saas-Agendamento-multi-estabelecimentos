import { Coupon } from './entities/coupon.entity';

export interface RedeemCouponParams {
  id: string;
  couponId: string;
  appointmentId: string;
  clientId: string;
  discountAppliedCents: number;
}

export abstract class CouponRepositoryPort {
  abstract create(coupon: Coupon): Promise<Coupon>;
  abstract update(coupon: Coupon): Promise<Coupon>;
  abstract findById(id: string, tenantId: string): Promise<Coupon | null>;
  abstract findByCode(tenantId: string, code: string): Promise<Coupon | null>;
  abstract findAllByTenant(tenantId: string, establishmentId?: string): Promise<Coupon[]>;
  abstract existsWithCode(tenantId: string, code: string): Promise<boolean>;

  /** Atomically re-validates the usage cap and, if still within it, increments `usedCount`
   * and inserts the CouponRedemption row — same "one method owns the cross-aggregate
   * transaction" pattern as PrismaAppointmentRepository.createIfAvailable. Throws
   * CouponExhaustedError if a concurrent redemption already used up the last slot. */
  abstract redeem(params: RedeemCouponParams): Promise<void>;
}
