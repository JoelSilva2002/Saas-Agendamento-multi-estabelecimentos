import { apiFetch } from "@/lib/api/client";

export type Establishment = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  timezone: string;
};

export function listEstablishments(tenantId: string): Promise<Establishment[]> {
  return apiFetch<Establishment[]>(`/tenants/${tenantId}/establishments`);
}
