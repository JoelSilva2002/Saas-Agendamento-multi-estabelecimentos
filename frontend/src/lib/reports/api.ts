import { apiFetch } from "@/lib/api/client";
import type {
  CancellationRate,
  ClientMetric,
  DateRangeParams,
  EmployeeMetric,
  HourMetric,
  MonthlyRevenue,
  ServiceMetric,
} from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/reports`;
}

function dateRangeQuery(params: DateRangeParams): string {
  const query = new URLSearchParams();
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function getMonthlyRevenue(
  tenantId: string,
  establishmentId: string,
  month: string,
): Promise<MonthlyRevenue> {
  return apiFetch<MonthlyRevenue>(`${basePath(tenantId, establishmentId)}/revenue?month=${month}`);
}

export function getTopServices(
  tenantId: string,
  establishmentId: string,
  params: DateRangeParams,
): Promise<ServiceMetric[]> {
  return apiFetch<ServiceMetric[]>(
    `${basePath(tenantId, establishmentId)}/top-services${dateRangeQuery(params)}`,
  );
}

export function getEmployeeProductivity(
  tenantId: string,
  establishmentId: string,
  params: DateRangeParams,
): Promise<EmployeeMetric[]> {
  return apiFetch<EmployeeMetric[]>(
    `${basePath(tenantId, establishmentId)}/employee-productivity${dateRangeQuery(params)}`,
  );
}

export function getTopClients(
  tenantId: string,
  establishmentId: string,
  params: DateRangeParams,
): Promise<ClientMetric[]> {
  return apiFetch<ClientMetric[]>(
    `${basePath(tenantId, establishmentId)}/top-clients${dateRangeQuery(params)}`,
  );
}

export function getCancellationRate(
  tenantId: string,
  establishmentId: string,
  params: DateRangeParams,
): Promise<CancellationRate> {
  return apiFetch<CancellationRate>(
    `${basePath(tenantId, establishmentId)}/cancellation-rate${dateRangeQuery(params)}`,
  );
}

export function getPeakHours(
  tenantId: string,
  establishmentId: string,
  params: DateRangeParams,
): Promise<HourMetric[]> {
  return apiFetch<HourMetric[]>(
    `${basePath(tenantId, establishmentId)}/peak-hours${dateRangeQuery(params)}`,
  );
}
