import { IsIn, IsISO8601, IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';
import { CouponDiscountType, CouponStatus } from '../../domain/entities/coupon.entity';

const DISCOUNT_TYPES: CouponDiscountType[] = ['percentage', 'fixed_amount'];
const STATUSES: CouponStatus[] = ['active', 'inactive', 'expired'];

export class UpdateCouponRequestDto {
  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  discountType?: CouponDiscountType;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  discountValue?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number;

  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: CouponStatus;
}
