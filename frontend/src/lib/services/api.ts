import { apiFetch } from "@/lib/api/client";
import type {
  CatalogService,
  CreateServiceCategoryInput,
  CreateServiceInput,
  ServiceCategory,
  UpdateServiceCategoryInput,
  UpdateServiceInput,
} from "./types";

function servicesPath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/services`;
}

function categoriesPath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/service-categories`;
}

export function listServices(tenantId: string, establishmentId: string): Promise<CatalogService[]> {
  return apiFetch<CatalogService[]>(servicesPath(tenantId, establishmentId));
}

export function createService(
  tenantId: string,
  establishmentId: string,
  input: CreateServiceInput,
): Promise<CatalogService> {
  return apiFetch<CatalogService>(servicesPath(tenantId, establishmentId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateService(
  tenantId: string,
  establishmentId: string,
  serviceId: string,
  input: UpdateServiceInput,
): Promise<CatalogService> {
  return apiFetch<CatalogService>(`${servicesPath(tenantId, establishmentId)}/${serviceId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deactivateService(
  tenantId: string,
  establishmentId: string,
  serviceId: string,
): Promise<CatalogService> {
  return apiFetch<CatalogService>(`${servicesPath(tenantId, establishmentId)}/${serviceId}`, {
    method: "DELETE",
  });
}

export function setServiceEmployees(
  tenantId: string,
  establishmentId: string,
  serviceId: string,
  employeeIds: string[],
): Promise<{ serviceId: string; employeeIds: string[] }> {
  return apiFetch(`${servicesPath(tenantId, establishmentId)}/${serviceId}/employees`, {
    method: "PUT",
    body: JSON.stringify({ employeeIds }),
  });
}

export function listServiceCategories(
  tenantId: string,
  establishmentId: string,
): Promise<ServiceCategory[]> {
  return apiFetch<ServiceCategory[]>(categoriesPath(tenantId, establishmentId));
}

export function createServiceCategory(
  tenantId: string,
  establishmentId: string,
  input: CreateServiceCategoryInput,
): Promise<ServiceCategory> {
  return apiFetch<ServiceCategory>(categoriesPath(tenantId, establishmentId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateServiceCategory(
  tenantId: string,
  establishmentId: string,
  categoryId: string,
  input: UpdateServiceCategoryInput,
): Promise<ServiceCategory> {
  return apiFetch<ServiceCategory>(`${categoriesPath(tenantId, establishmentId)}/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteServiceCategory(
  tenantId: string,
  establishmentId: string,
  categoryId: string,
): Promise<void> {
  return apiFetch<void>(`${categoriesPath(tenantId, establishmentId)}/${categoryId}`, {
    method: "DELETE",
  });
}
