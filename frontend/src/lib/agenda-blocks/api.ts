import { apiFetch } from "@/lib/api/client";
import type { AgendaBlockRecord, CreateAgendaBlockInput, ListAgendaBlocksParams } from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/agenda-blocks`;
}

export function listAgendaBlocks(
  tenantId: string,
  establishmentId: string,
  params: ListAgendaBlocksParams,
): Promise<AgendaBlockRecord[]> {
  const query = new URLSearchParams();
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.employeeId) query.set("employeeId", params.employeeId);
  return apiFetch<AgendaBlockRecord[]>(`${basePath(tenantId, establishmentId)}?${query.toString()}`);
}

export function createAgendaBlock(
  tenantId: string,
  establishmentId: string,
  input: CreateAgendaBlockInput,
): Promise<AgendaBlockRecord> {
  return apiFetch<AgendaBlockRecord>(basePath(tenantId, establishmentId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteAgendaBlock(
  tenantId: string,
  establishmentId: string,
  blockId: string,
): Promise<void> {
  return apiFetch<void>(`${basePath(tenantId, establishmentId)}/${blockId}`, { method: "DELETE" });
}
