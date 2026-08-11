import { apiFetch } from "@/lib/api/client";
import type { CreatePaymentInput, ListPaymentsParams, Payment } from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/payments`;
}

export function listPayments(
  tenantId: string,
  establishmentId: string,
  params: ListPaymentsParams = {},
): Promise<Payment[]> {
  const query = new URLSearchParams();
  if (params.appointmentId) query.set("appointmentId", params.appointmentId);
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return apiFetch<Payment[]>(`${basePath(tenantId, establishmentId)}${qs ? `?${qs}` : ""}`);
}

export function createPayment(
  tenantId: string,
  establishmentId: string,
  input: CreatePaymentInput,
): Promise<Payment> {
  return apiFetch<Payment>(basePath(tenantId, establishmentId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function markPaymentPaid(
  tenantId: string,
  establishmentId: string,
  paymentId: string,
): Promise<Payment> {
  return apiFetch<Payment>(`${basePath(tenantId, establishmentId)}/${paymentId}/mark-paid`, {
    method: "PATCH",
  });
}
