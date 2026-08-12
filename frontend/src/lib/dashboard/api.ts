import { apiFetch } from "@/lib/api/client";
import type { DailySummary } from "./types";

export function getDailySummary(
  tenantId: string,
  establishmentId: string,
  date: string,
): Promise<DailySummary> {
  return apiFetch<DailySummary>(
    `/tenants/${tenantId}/establishments/${establishmentId}/dashboard/summary?date=${date}`,
  );
}
