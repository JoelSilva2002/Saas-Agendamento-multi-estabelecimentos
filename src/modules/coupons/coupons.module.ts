import { Module } from '@nestjs/common';
import { CouponRepositoryPort } from './domain/coupon.repository.port';
import { PrismaCouponRepository } from './infrastructure/persistence/prisma-coupon.repository';
import { CreateCouponUseCase } from './application/use-cases/create-coupon.use-case';
import { UpdateCouponUseCase } from './application/use-cases/update-coupon.use-case';
import { DeactivateCouponUseCase } from './application/use-cases/deactivate-coupon.use-case';
import { ListCouponsUseCase } from './application/use-cases/list-coupons.use-case';
import { ValidateCouponUseCase } from './application/use-cases/validate-coupon.use-case';
import { CouponsController } from './presentation/coupons.controller';

@Module({
  controllers: [CouponsController],
  providers: [
    { provide: CouponRepositoryPort, useClass: PrismaCouponRepository },
    CreateCouponUseCase,
    UpdateCouponUseCase,
    DeactivateCouponUseCase,
    ListCouponsUseCase,
    ValidateCouponUseCase,
  ],
  // Consumed by PaymentsModule (one-directional) to validate/redeem a coupon at payment
  // time — Coupons never imports Payments, so no cycle.
  exports: [CouponRepositoryPort, ValidateCouponUseCase],
})
export class CouponsModule {}
