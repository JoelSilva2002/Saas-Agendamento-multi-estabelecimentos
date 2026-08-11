import { apiFetch } from "@/lib/api/client";
import type { ClientProfile, UpdateClientProfileInput } from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/clients`;
}

export function listClients(tenantId: string, establishmentId: string): Promise<ClientProfile[]> {
  return apiFetch<ClientProfile[]>(basePath(tenantId, establishmentId));
}

export function updateClientProfile(
  tenantId: string,
  establishmentId: string,
  clientId: string,
  input: UpdateClientProfileInput,
): Promise<ClientProfile> {
  return apiFetch<ClientProfile>(`${basePath(tenantId, establishmentId)}/${clientId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
