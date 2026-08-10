import { Injectable } from '@nestjs/common';
import { CouponRepositoryPort } from '../../domain/coupon.repository.port';
import { Coupon, CouponDiscountType, CouponStatus } from '../../domain/entities/coupon.entity';
import { CouponNotFoundError } from '../../domain/errors/coupon-errors';

export interface UpdateCouponInput {
  tenantId: string;
  couponId: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  maxUses?: number | null;
  minPurchaseCents?: number | null;
  validFrom?: Date;
  validUntil?: Date;
  status?: CouponStatus;
}

@Injectable()
export class UpdateCouponUseCase {
  constructor(private readonly couponRepository: CouponRepositoryPort) {}

  async execute(input: UpdateCouponInput): Promise<Coupon> {
    const coupon = await this.couponRepository.findById(input.couponId, input.tenantId);
    if (!coupon) {
      throw new CouponNotFoundError(input.couponId);
    }

    const updated = coupon.update({
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxUses: input.maxUses,
      minPurchaseCents: input.minPurchaseCents,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      status: input.status,
    });

    return this.couponRepository.update(updated);
  }
}
