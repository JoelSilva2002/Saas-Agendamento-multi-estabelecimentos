import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Coupon } from '../../domain/entities/coupon.entity';
import { CouponRepositoryPort, RedeemCouponParams } from '../../domain/coupon.repository.port';
import {
  CouponAlreadyRedeemedForAppointmentError,
  CouponExhaustedError,
} from '../../domain/errors/coupon-errors';
import { CouponMapper } from './coupon.mapper';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaCouponRepository implements CouponRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(coupon: Coupon): Promise<Coupon> {
    const props = coupon.toPersistenceProps();
    const created = await this.prisma.coupon.create({
      data: {
        id: props.id,
        tenantId: props.tenantId,
        establishmentId: props.establishmentId,
        code: props.code,
        discountType: props.discountType,
        discountValue: props.discountValue,
        maxUses: props.maxUses,
        usedCount: props.usedCount,
        minPurchaseCents: props.minPurchaseCents,
        validFrom: props.validFrom,
        validUntil: props.validUntil,
        status: props.status,
      },
    });
    return CouponMapper.toDomain(created);
  }

  async update(coupon: Coupon): Promise<Coupon> {
    const props = coupon.toPersistenceProps();
    const updated = await this.prisma.coupon.update({
      where: { id: props.id },
      data: {
        discountType: props.discountType,
        discountValue: props.discountValue,
        maxUses: props.maxUses,
        minPurchaseCents: props.minPurchaseCents,
        validFrom: props.validFrom,
        validUntil: props.validUntil,
        status: props.status,
      },
    });
    return CouponMapper.toDomain(updated);
  }

  async findById(id: string, tenantId: string): Promise<Coupon | null> {
    const found = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    return found ? CouponMapper.toDomain(found) : null;
  }

  async findByCode(tenantId: string, code: string): Promise<Coupon | null> {
    const found = await this.prisma.coupon.findFirst({
      where: { tenantId, code: code.toUpperCase() },
    });
    return found ? CouponMapper.toDomain(found) : null;
  }

  async findAllByTenant(tenantId: string, establishmentId?: string): Promise<Coupon[]> {
    const records = await this.prisma.coupon.findMany({
      where: {
        tenantId,
        ...(establishmentId ? { OR: [{ establishmentId }, { establishmentId: null }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(CouponMapper.toDomain);
  }

  async existsWithCode(tenantId: string, code: string): Promise<boolean> {
    const count = await this.prisma.coupon.count({ where: { tenantId, code: code.toUpperCase() } });
    return count > 0;
  }

  async redeem(params: RedeemCouponParams): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const coupon = await tx.coupon.findUniqueOrThrow({ where: { id: params.couponId } });
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
          throw new CouponExhaustedError();
        }

        await tx.coupon.update({
          where: { id: params.couponId },
          data: { usedCount: { increment: 1 } },
        });
        await tx.couponRedemption.create({
          data: {
            id: params.id,
            couponId: params.couponId,
            appointmentId: params.appointmentId,
            clientId: params.clientId,
            discountAppliedCents: params.discountAppliedCents,
          },
        });
      });
    } catch (error) {
      if (error instanceof CouponExhaustedError) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new CouponAlreadyRedeemedForAppointmentError();
      }
      throw error;
    }
  }
}
