import { apiFetch } from "@/lib/api/client";
import type { BusinessHoursDay, Establishment, UpdateEstablishmentInput } from "./types";

export type { Establishment } from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}`;
}

export function listEstablishments(tenantId: string): Promise<Establishment[]> {
  return apiFetch<Establishment[]>(`/tenants/${tenantId}/establishments`);
}

export function getEstablishment(tenantId: string, establishmentId: string): Promise<Establishment> {
  return apiFetch<Establishment>(basePath(tenantId, establishmentId));
}

export function updateEstablishment(
  tenantId: string,
  establishmentId: string,
  input: UpdateEstablishmentInput,
): Promise<Establishment> {
  return apiFetch<Establishment>(basePath(tenantId, establishmentId), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getBusinessHours(
  tenantId: string,
  establishmentId: string,
): Promise<BusinessHoursDay[]> {
  return apiFetch<BusinessHoursDay[]>(`${basePath(tenantId, establishmentId)}/business-hours`);
}

export function setBusinessHours(
  tenantId: string,
  establishmentId: string,
  days: BusinessHoursDay[],
): Promise<BusinessHoursDay[]> {
  return apiFetch<BusinessHoursDay[]>(`${basePath(tenantId, establishmentId)}/business-hours`, {
    method: "PUT",
    body: JSON.stringify({ days }),
  });
}
