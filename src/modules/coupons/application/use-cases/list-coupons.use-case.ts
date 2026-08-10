import { Injectable } from '@nestjs/common';
import { CouponRepositoryPort } from '../../domain/coupon.repository.port';
import { Coupon } from '../../domain/entities/coupon.entity';

@Injectable()
export class ListCouponsUseCase {
  constructor(private readonly couponRepository: CouponRepositoryPort) {}

  async execute(tenantId: string, establishmentId?: string): Promise<Coupon[]> {
    return this.couponRepository.findAllByTenant(tenantId, establishmentId);
  }
}
