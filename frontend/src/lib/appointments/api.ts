import { apiFetch } from "@/lib/api/client";
import type { Appointment, CreateAppointmentInput, ListAppointmentsParams } from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}`;
}

export function listAppointments(
  tenantId: string,
  establishmentId: string,
  params: ListAppointmentsParams,
): Promise<Appointment[]> {
  const query = new URLSearchParams();
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (params.clientId) query.set("clientId", params.clientId);
  if (params.status) query.set("status", params.status);
  return apiFetch<Appointment[]>(`${basePath(tenantId, establishmentId)}/appointments?${query.toString()}`);
}

export function createAppointment(
  tenantId: string,
  establishmentId: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  return apiFetch<Appointment>(`${basePath(tenantId, establishmentId)}/appointments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelAppointment(
  tenantId: string,
  establishmentId: string,
  appointmentId: string,
  reason: string,
): Promise<Appointment> {
  return apiFetch<Appointment>(
    `${basePath(tenantId, establishmentId)}/appointments/${appointmentId}/cancel`,
    { method: "PATCH", body: JSON.stringify({ reason }) },
  );
}

export function rescheduleAppointment(
  tenantId: string,
  establishmentId: string,
  appointmentId: string,
  input: { startAt: string; employeeId?: string },
): Promise<Appointment> {
  return apiFetch<Appointment>(
    `${basePath(tenantId, establishmentId)}/appointments/${appointmentId}/reschedule`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function markNoShow(
  tenantId: string,
  establishmentId: string,
  appointmentId: string,
): Promise<Appointment> {
  return apiFetch<Appointment>(
    `${basePath(tenantId, establishmentId)}/appointments/${appointmentId}/no-show`,
    { method: "PATCH" },
  );
}

export function completeAppointment(
  tenantId: string,
  establishmentId: string,
  appointmentId: string,
): Promise<Appointment> {
  return apiFetch<Appointment>(
    `${basePath(tenantId, establishmentId)}/appointments/${appointmentId}/complete`,
    { method: "PATCH" },
  );
}
