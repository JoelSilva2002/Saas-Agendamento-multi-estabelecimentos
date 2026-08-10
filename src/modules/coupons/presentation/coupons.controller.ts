import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { CreateCouponUseCase } from '../application/use-cases/create-coupon.use-case';
import { UpdateCouponUseCase } from '../application/use-cases/update-coupon.use-case';
import { DeactivateCouponUseCase } from '../application/use-cases/deactivate-coupon.use-case';
import { ListCouponsUseCase } from '../application/use-cases/list-coupons.use-case';
import { CreateCouponRequestDto } from './dto/create-coupon.request.dto';
import { UpdateCouponRequestDto } from './dto/update-coupon.request.dto';
import { Coupon } from '../domain/entities/coupon.entity';

@Controller('tenants/:tenantId/coupons')
export class CouponsController {
  constructor(
    private readonly createCoupon: CreateCouponUseCase,
    private readonly updateCoupon: UpdateCouponUseCase,
    private readonly deactivateCoupon: DeactivateCouponUseCase,
    private readonly listCoupons: ListCouponsUseCase,
  ) {}

  @Post()
  @Auth('coupon:manage')
  async create(@Param('tenantId') tenantId: string, @Body() dto: CreateCouponRequestDto) {
    const coupon = await this.createCoupon.execute({
      tenantId,
      establishmentId: dto.establishmentId,
      code: dto.code,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxUses: dto.maxUses,
      minPurchaseCents:
        dto.minPurchase !== undefined ? Math.round(dto.minPurchase * 100) : undefined,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
    });
    return this.toResponse(coupon);
  }

  @Get()
  @Auth('coupon:manage')
  async list(
    @Param('tenantId') tenantId: string,
    @Query('establishmentId') establishmentId?: string,
  ) {
    const coupons = await this.listCoupons.execute(tenantId, establishmentId);
    return coupons.map((coupon) => this.toResponse(coupon));
  }

  @Patch(':couponId')
  @Auth('coupon:manage')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('couponId') couponId: string,
    @Body() dto: UpdateCouponRequestDto,
  ) {
    const coupon = await this.updateCoupon.execute({
      tenantId,
      couponId,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxUses: dto.maxUses,
      minPurchaseCents:
        dto.minPurchase !== undefined ? Math.round(dto.minPurchase * 100) : undefined,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      status: dto.status,
    });
    return this.toResponse(coupon);
  }

  @Patch(':couponId/deactivate')
  @Auth('coupon:manage')
  async deactivate(@Param('tenantId') tenantId: string, @Param('couponId') couponId: string) {
    const coupon = await this.deactivateCoupon.execute({ tenantId, couponId });
    return this.toResponse(coupon);
  }

  private toResponse(coupon: Coupon) {
    return {
      id: coupon.id,
      tenantId: coupon.tenantId,
      establishmentId: coupon.establishmentId,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      minPurchaseCents: coupon.minPurchaseCents,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      status: coupon.status,
    };
  }
}
