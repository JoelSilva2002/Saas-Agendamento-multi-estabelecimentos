import { apiFetch } from "@/lib/api/client";
import type { Review, ReviewSummary } from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/reviews`;
}

export function listReviews(
  tenantId: string,
  establishmentId: string,
  employeeId?: string,
): Promise<Review[]> {
  const query = employeeId ? `?employeeId=${employeeId}` : "";
  return apiFetch<Review[]>(`${basePath(tenantId, establishmentId)}${query}`);
}

export function getReviewSummary(
  tenantId: string,
  establishmentId: string,
  employeeId?: string,
): Promise<ReviewSummary> {
  const query = employeeId ? `?employeeId=${employeeId}` : "";
  return apiFetch<ReviewSummary>(`${basePath(tenantId, establishmentId)}/summary${query}`);
}

export function deleteReview(
  tenantId: string,
  establishmentId: string,
  reviewId: string,
): Promise<void> {
  return apiFetch<void>(`${basePath(tenantId, establishmentId)}/${reviewId}`, {
    method: "DELETE",
  });
}
