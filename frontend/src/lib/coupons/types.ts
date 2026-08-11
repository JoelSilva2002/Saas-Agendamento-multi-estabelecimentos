export type CouponDiscountType = "percentage" | "fixed_amount";
export type CouponStatus = "active" | "inactive" | "expired";

export type Coupon = {
  id: string;
  tenantId: string;
  establishmentId: string | null;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  minPurchaseCents: number | null;
  validFrom: string;
  validUntil: string;
  status: CouponStatus;
};

export type CreateCouponInput = {
  establishmentId?: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUses?: number;
  minPurchase?: number;
  validFrom: string;
  validUntil: string;
};

export type UpdateCouponInput = {
  discountType?: CouponDiscountType;
  discountValue?: number;
  maxUses?: number;
  minPurchase?: number;
  validFrom?: string;
  validUntil?: string;
};
