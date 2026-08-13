import { apiFetch } from "@/lib/api/client";
import type { ApiKey, CreateApiKeyInput, CreateApiKeyResult } from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/api-keys`;
}

export function listApiKeys(tenantId: string, establishmentId: string): Promise<ApiKey[]> {
  return apiFetch<ApiKey[]>(basePath(tenantId, establishmentId));
}

export function createApiKey(
  tenantId: string,
  establishmentId: string,
  input: CreateApiKeyInput,
): Promise<CreateApiKeyResult> {
  return apiFetch<CreateApiKeyResult>(basePath(tenantId, establishmentId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revokeApiKey(
  tenantId: string,
  establishmentId: string,
  apiKeyId: string,
): Promise<void> {
  return apiFetch<void>(`${basePath(tenantId, establishmentId)}/${apiKeyId}`, {
    method: "DELETE",
  });
}
