import { apiFetch } from "@/lib/api/client";
import type {
  Client,
  ClientProfile,
  CreateClientInput,
  CreateClientResult,
  UpdateClientProfileInput,
} from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/clients`;
}

export function listClients(tenantId: string, establishmentId: string): Promise<Client[]> {
  return apiFetch<Client[]>(basePath(tenantId, establishmentId));
}

/** Resolves an existing client by e-mail/phone or creates a new walk-in account — see
 * ResolveOrCreateClientUseCase on the backend. Used both by the Clientes screen's "Novo
 * cliente" button and the Agenda's fit-in dialog inline creation. */
export function createClient(
  tenantId: string,
  establishmentId: string,
  input: CreateClientInput,
): Promise<CreateClientResult> {
  return apiFetch<CreateClientResult>(basePath(tenantId, establishmentId), {
    method: "POST",
    body: JSON.stringify(input),
  });
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
