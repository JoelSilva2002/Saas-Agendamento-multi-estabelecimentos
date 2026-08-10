import {
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { CouponDiscountType } from '../../domain/entities/coupon.entity';

const DISCOUNT_TYPES: CouponDiscountType[] = ['percentage', 'fixed_amount'];

export class CreateCouponRequestDto {
  @IsOptional()
  @IsUUID()
  establishmentId?: string;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsIn(DISCOUNT_TYPES)
  discountType!: CouponDiscountType;

  @IsNumber()
  @IsPositive()
  discountValue!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  /** Reais, same convention as Service.price — converted to minPurchaseCents server-side. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number;

  @IsISO8601()
  validFrom!: string;

  @IsISO8601()
  validUntil!: string;
}
