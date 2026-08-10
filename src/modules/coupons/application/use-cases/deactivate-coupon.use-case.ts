import { Injectable } from '@nestjs/common';
import { CouponRepositoryPort } from '../../domain/coupon.repository.port';
import { Coupon } from '../../domain/entities/coupon.entity';
import { CouponNotFoundError } from '../../domain/errors/coupon-errors';

export interface DeactivateCouponInput {
  tenantId: string;
  couponId: string;
}

@Injectable()
export class DeactivateCouponUseCase {
  constructor(private readonly couponRepository: CouponRepositoryPort) {}

  async execute(input: DeactivateCouponInput): Promise<Coupon> {
    const coupon = await this.couponRepository.findById(input.couponId, input.tenantId);
    if (!coupon) {
      throw new CouponNotFoundError(input.couponId);
    }

    return this.couponRepository.update(coupon.deactivate());
  }
}
