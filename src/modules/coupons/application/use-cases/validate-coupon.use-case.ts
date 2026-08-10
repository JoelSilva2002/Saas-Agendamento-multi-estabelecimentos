import { Injectable } from '@nestjs/common';
import { CouponRepositoryPort } from '../../domain/coupon.repository.port';
import { CouponInvalidError, CouponNotFoundError } from '../../domain/errors/coupon-errors';

export interface ValidateCouponInput {
  tenantId: string;
  establishmentId: string;
  code: string;
  amountCents: number;
}

export interface ValidateCouponResult {
  couponId: string;
  discountCents: number;
}

/** Read-only validation, used by PaymentsModule's CreatePaymentUseCase — does NOT redeem
 * anything (that's CouponRepositoryPort.redeem, called separately once the payment is about
 * to be persisted, so the discount is never "reserved" without a payment actually forming). */
@Injectable()
export class ValidateCouponUseCase {
  constructor(private readonly couponRepository: CouponRepositoryPort) {}

  async execute(input: ValidateCouponInput): Promise<ValidateCouponResult> {
    const coupon = await this.couponRepository.findByCode(input.tenantId, input.code);
    if (!coupon) {
      throw new CouponNotFoundError(input.code);
    }
    if (coupon.establishmentId !== null && coupon.establishmentId !== input.establishmentId) {
      throw new CouponInvalidError('não é válido para este estabelecimento');
    }

    coupon.assertRedeemable(input.amountCents);

    return { couponId: coupon.id, discountCents: coupon.computeDiscountCents(input.amountCents) };
  }
}
