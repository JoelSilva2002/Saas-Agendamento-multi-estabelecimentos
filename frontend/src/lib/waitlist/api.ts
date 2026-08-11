import { apiFetch } from "@/lib/api/client";
import type { JoinWaitlistInput, WaitlistEntry, WaitlistStatus } from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/waitlist`;
}

export function listWaitlist(
  tenantId: string,
  establishmentId: string,
  status?: WaitlistStatus,
): Promise<WaitlistEntry[]> {
  const query = status ? `?status=${status}` : "";
  return apiFetch<WaitlistEntry[]>(`${basePath(tenantId, establishmentId)}${query}`);
}

export function joinWaitlist(
  tenantId: string,
  establishmentId: string,
  input: JoinWaitlistInput,
): Promise<WaitlistEntry> {
  return apiFetch<WaitlistEntry>(basePath(tenantId, establishmentId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelWaitlistEntry(
  tenantId: string,
  establishmentId: string,
  entryId: string,
): Promise<WaitlistEntry> {
  return apiFetch<WaitlistEntry>(`${basePath(tenantId, establishmentId)}/${entryId}`, {
    method: "DELETE",
  });
}
