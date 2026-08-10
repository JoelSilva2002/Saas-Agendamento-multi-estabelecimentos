import { Coupon as PrismaCoupon } from '@prisma/client';
import { Coupon } from '../../domain/entities/coupon.entity';

export class CouponMapper {
  static toDomain(record: PrismaCoupon): Coupon {
    return Coupon.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      establishmentId: record.establishmentId,
      code: record.code,
      discountType: record.discountType,
      discountValue: record.discountValue.toNumber(),
      maxUses: record.maxUses,
      usedCount: record.usedCount,
      minPurchaseCents: record.minPurchaseCents,
      validFrom: record.validFrom,
      validUntil: record.validUntil,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
