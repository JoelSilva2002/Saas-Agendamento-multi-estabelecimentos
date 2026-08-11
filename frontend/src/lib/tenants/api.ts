import { apiFetch } from "@/lib/api/client";
import type {
  CreateTenantInput,
  CreateTenantOutput,
  ImpersonateTenantOutput,
  ListTenantsParams,
  PaginatedTenants,
  Tenant,
  TenantStatus,
} from "./types";

export function listTenants(params: ListTenantsParams): Promise<PaginatedTenants> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    ...(params.search ? { search: params.search } : {}),
    ...(params.status ? { status: params.status } : {}),
  });
  return apiFetch<PaginatedTenants>(`/tenants?${query.toString()}`);
}

export function createTenant(input: CreateTenantInput): Promise<CreateTenantOutput> {
  return apiFetch<CreateTenantOutput>("/tenants", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTenantStatus(tenantId: string, status: TenantStatus): Promise<Tenant> {
  return apiFetch<Tenant>(`/tenants/${tenantId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function impersonateTenant(tenantId: string): Promise<ImpersonateTenantOutput> {
  return apiFetch<ImpersonateTenantOutput>(`/tenants/${tenantId}/impersonate`, { method: "POST" });
}

export function endImpersonation(sessionId: string): Promise<void> {
  return apiFetch<void>(`/tenants/impersonation/${sessionId}/end`, { method: "POST" });
}
