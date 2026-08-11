import { apiFetch } from "@/lib/api/client";
import type { Coupon, CreateCouponInput, UpdateCouponInput } from "./types";

function basePath(tenantId: string): string {
  return `/tenants/${tenantId}/coupons`;
}

export function listCoupons(tenantId: string, establishmentId: string): Promise<Coupon[]> {
  return apiFetch<Coupon[]>(`${basePath(tenantId)}?establishmentId=${establishmentId}`);
}

export function createCoupon(tenantId: string, input: CreateCouponInput): Promise<Coupon> {
  return apiFetch<Coupon>(basePath(tenantId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCoupon(
  tenantId: string,
  couponId: string,
  input: UpdateCouponInput,
): Promise<Coupon> {
  return apiFetch<Coupon>(`${basePath(tenantId)}/${couponId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deactivateCoupon(tenantId: string, couponId: string): Promise<Coupon> {
  return apiFetch<Coupon>(`${basePath(tenantId)}/${couponId}/deactivate`, {
    method: "PATCH",
  });
}
