import { ValidationError } from '../../../../shared-kernel/domain/domain-error';
import { CouponInvalidError } from '../errors/coupon-errors';

export type CouponDiscountType = 'percentage' | 'fixed_amount';
export type CouponStatus = 'active' | 'inactive' | 'expired';

export interface CouponProps {
  id: string;
  tenantId: string;
  establishmentId: string | null;
  code: string;
  discountType: CouponDiscountType;
  /** Percentage (0-100) when discountType is 'percentage'; reais (major currency unit,
   * matching how Service.price is accepted before conversion to priceCents) when
   * 'fixed_amount'. */
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  minPurchaseCents: number | null;
  validFrom: Date;
  validUntil: Date;
  status: CouponStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCouponProps {
  id: string;
  tenantId: string;
  establishmentId?: string | null;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUses?: number | null;
  minPurchaseCents?: number | null;
  validFrom: Date;
  validUntil: Date;
}

export class Coupon {
  private constructor(private readonly props: CouponProps) {}

  static create(props: CreateCouponProps): Coupon {
    const code = props.code.trim().toUpperCase();
    if (code.length === 0) {
      throw new ValidationError('Coupon requer um código não vazio');
    }
    if (props.validFrom >= props.validUntil) {
      throw new ValidationError('Coupon requer validFrom anterior a validUntil');
    }
    Coupon.assertValidDiscountValue(props.discountType, props.discountValue);
    if (
      props.maxUses !== undefined &&
      props.maxUses !== null &&
      (!Number.isInteger(props.maxUses) || props.maxUses < 1)
    ) {
      throw new ValidationError('maxUses deve ser um inteiro positivo quando informado');
    }
    if (
      props.minPurchaseCents !== undefined &&
      props.minPurchaseCents !== null &&
      (!Number.isInteger(props.minPurchaseCents) || props.minPurchaseCents < 0)
    ) {
      throw new ValidationError(
        'minPurchaseCents deve ser um inteiro não negativo quando informado',
      );
    }

    const now = new Date();
    return new Coupon({
      id: props.id,
      tenantId: props.tenantId,
      establishmentId: props.establishmentId ?? null,
      code,
      discountType: props.discountType,
      discountValue: props.discountValue,
      maxUses: props.maxUses ?? null,
      usedCount: 0,
      minPurchaseCents: props.minPurchaseCents ?? null,
      validFrom: props.validFrom,
      validUntil: props.validUntil,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  private static assertValidDiscountValue(
    discountType: CouponDiscountType,
    discountValue: number,
  ): void {
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      throw new ValidationError('discountValue deve ser um número positivo');
    }
    if (discountType === 'percentage' && discountValue > 100) {
      throw new ValidationError('discountValue percentual não pode passar de 100');
    }
  }

  static fromPersistence(props: CouponProps): Coupon {
    return new Coupon(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get establishmentId(): string | null {
    return this.props.establishmentId;
  }

  get code(): string {
    return this.props.code;
  }

  get discountType(): CouponDiscountType {
    return this.props.discountType;
  }

  get discountValue(): number {
    return this.props.discountValue;
  }

  get maxUses(): number | null {
    return this.props.maxUses;
  }

  get usedCount(): number {
    return this.props.usedCount;
  }

  get minPurchaseCents(): number | null {
    return this.props.minPurchaseCents;
  }

  get validFrom(): Date {
    return this.props.validFrom;
  }

  get validUntil(): Date {
    return this.props.validUntil;
  }

  get status(): CouponStatus {
    return this.props.status;
  }

  update(changes: {
    discountType?: CouponDiscountType;
    discountValue?: number;
    maxUses?: number | null;
    minPurchaseCents?: number | null;
    validFrom?: Date;
    validUntil?: Date;
    status?: CouponStatus;
  }): Coupon {
    const discountType = changes.discountType ?? this.props.discountType;
    const discountValue = changes.discountValue ?? this.props.discountValue;
    Coupon.assertValidDiscountValue(discountType, discountValue);

    const validFrom = changes.validFrom ?? this.props.validFrom;
    const validUntil = changes.validUntil ?? this.props.validUntil;
    if (validFrom >= validUntil) {
      throw new ValidationError('Coupon requer validFrom anterior a validUntil');
    }

    return new Coupon({
      ...this.props,
      discountType,
      discountValue,
      maxUses: changes.maxUses !== undefined ? changes.maxUses : this.props.maxUses,
      minPurchaseCents:
        changes.minPurchaseCents !== undefined
          ? changes.minPurchaseCents
          : this.props.minPurchaseCents,
      validFrom,
      validUntil,
      status: changes.status ?? this.props.status,
      updatedAt: new Date(),
    });
  }

  deactivate(): Coupon {
    return this.update({ status: 'inactive' });
  }

  /** Checks everything the entity itself can know (status/validity window/usage cap/minimum
   * purchase) — does NOT check tenant/establishment scoping, that's the repository lookup's
   * job. Throws CouponInvalidError with a specific reason rather than returning a boolean,
   * since the caller always wants to surface *why* to the client. */
  assertRedeemable(amountCents: number, now: Date = new Date()): void {
    if (this.props.status !== 'active') {
      throw new CouponInvalidError(`status '${this.props.status}'`);
    }
    if (now < this.props.validFrom || now > this.props.validUntil) {
      throw new CouponInvalidError('fora do período de validade');
    }
    if (this.props.maxUses !== null && this.props.usedCount >= this.props.maxUses) {
      throw new CouponInvalidError('limite de usos atingido');
    }
    if (this.props.minPurchaseCents !== null && amountCents < this.props.minPurchaseCents) {
      throw new CouponInvalidError(
        `valor mínimo de compra é ${this.props.minPurchaseCents} centavos`,
      );
    }
  }

  /** Discount cents for a given amount, capped so it never exceeds the amount itself (no
   * negative net payment). */
  computeDiscountCents(amountCents: number): number {
    const raw =
      this.props.discountType === 'percentage'
        ? Math.round((amountCents * this.props.discountValue) / 100)
        : Math.round(this.props.discountValue * 100);
    return Math.min(raw, amountCents);
  }

  toPersistenceProps(): CouponProps {
    return { ...this.props };
  }
}
