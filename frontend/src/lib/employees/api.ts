import { apiFetch } from "@/lib/api/client";
import type { CreateEmployeeInput, Employee, ScheduleSlot, UpdateEmployeeInput } from "./types";

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/employees`;
}

export function listEmployees(tenantId: string, establishmentId: string): Promise<Employee[]> {
  return apiFetch<Employee[]>(basePath(tenantId, establishmentId));
}

export function listEligibleEmployees(
  tenantId: string,
  establishmentId: string,
  serviceId: string,
): Promise<Employee[]> {
  return apiFetch<Employee[]>(
    `/tenants/${tenantId}/establishments/${establishmentId}/services/${serviceId}/employees`,
  );
}

export function createEmployee(
  tenantId: string,
  establishmentId: string,
  input: CreateEmployeeInput,
): Promise<Employee> {
  return apiFetch<Employee>(basePath(tenantId, establishmentId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateEmployee(
  tenantId: string,
  establishmentId: string,
  employeeId: string,
  input: UpdateEmployeeInput,
): Promise<Employee> {
  return apiFetch<Employee>(`${basePath(tenantId, establishmentId)}/${employeeId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deactivateEmployee(
  tenantId: string,
  establishmentId: string,
  employeeId: string,
): Promise<Employee> {
  return apiFetch<Employee>(`${basePath(tenantId, establishmentId)}/${employeeId}`, {
    method: "DELETE",
  });
}

export function getEmployeeSchedule(
  tenantId: string,
  establishmentId: string,
  employeeId: string,
): Promise<ScheduleSlot[]> {
  return apiFetch<ScheduleSlot[]>(`${basePath(tenantId, establishmentId)}/${employeeId}/schedule`);
}

export function setEmployeeSchedule(
  tenantId: string,
  establishmentId: string,
  employeeId: string,
  slots: ScheduleSlot[],
): Promise<ScheduleSlot[]> {
  return apiFetch<ScheduleSlot[]>(`${basePath(tenantId, establishmentId)}/${employeeId}/schedule`, {
    method: "PUT",
    body: JSON.stringify({ slots }),
  });
}
