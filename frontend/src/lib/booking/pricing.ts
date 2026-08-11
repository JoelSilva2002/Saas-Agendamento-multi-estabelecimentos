import type { CouponPreview, PaymentType } from "./types";

export const DEPOSIT_PERCENTAGE = 30;

// Mirrors the backend's charge computation (base amount = full price or the
// deposit percentage of it, then a coupon discount applied on top, capped so
// the charge never goes negative) so the wizard's live preview matches what
// payment creation will actually charge.
export function computeChargeCents({
  priceCents,
  paymentType,
  coupon,
}: {
  priceCents: number;
  paymentType: PaymentType;
  coupon: CouponPreview | null;
}): { baseCents: number; discountCents: number; totalCents: number } {
  const baseCents =
    paymentType === "deposit"
      ? Math.round((priceCents * DEPOSIT_PERCENTAGE) / 100)
      : priceCents;

  let discountCents = 0;
  if (coupon) {
    discountCents =
      coupon.discountType === "percentage"
        ? Math.round((baseCents * coupon.discountValue) / 100)
        : Math.round(coupon.discountValue * 100);
    discountCents = Math.min(discountCents, baseCents);
  }

  return { baseCents, discountCents, totalCents: baseCents - discountCents };
}

export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
