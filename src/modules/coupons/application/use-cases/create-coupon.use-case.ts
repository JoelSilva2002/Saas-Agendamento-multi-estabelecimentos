import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { CouponRepositoryPort } from '../../domain/coupon.repository.port';
import { Coupon, CouponDiscountType } from '../../domain/entities/coupon.entity';
import { DuplicateCouponCodeError } from '../../domain/errors/coupon-errors';

export interface CreateCouponInput {
  tenantId: string;
  establishmentId?: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUses?: number;
  minPurchaseCents?: number;
  validFrom: Date;
  validUntil: Date;
}

@Injectable()
export class CreateCouponUseCase {
  constructor(private readonly couponRepository: CouponRepositoryPort) {}

  async execute(input: CreateCouponInput): Promise<Coupon> {
    const codeTaken = await this.couponRepository.existsWithCode(input.tenantId, input.code);
    if (codeTaken) {
      throw new DuplicateCouponCodeError(input.code);
    }

    const coupon = Coupon.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      establishmentId: input.establishmentId,
      code: input.code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxUses: input.maxUses,
      minPurchaseCents: input.minPurchaseCents,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
    });

    return this.couponRepository.create(coupon);
  }
}
