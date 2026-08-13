import { apiFetch } from "@/lib/api/client";
import type { EstablishmentPhoto } from "./types";

export type EstablishmentLogoResult = { logoUrl: string; logoThumbUrl: string };

function basePath(tenantId: string, establishmentId: string): string {
  return `/tenants/${tenantId}/establishments/${establishmentId}/media`;
}

export function uploadLogo(
  tenantId: string,
  establishmentId: string,
  file: File,
): Promise<EstablishmentLogoResult> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<EstablishmentLogoResult>(`${basePath(tenantId, establishmentId)}/logo`, {
    method: "PUT",
    body,
  });
}

export function removeLogo(tenantId: string, establishmentId: string): Promise<void> {
  return apiFetch<void>(`${basePath(tenantId, establishmentId)}/logo`, { method: "DELETE" });
}

export function listPhotos(tenantId: string, establishmentId: string): Promise<EstablishmentPhoto[]> {
  return apiFetch<EstablishmentPhoto[]>(`${basePath(tenantId, establishmentId)}/photos`);
}

export function uploadPhoto(
  tenantId: string,
  establishmentId: string,
  file: File,
): Promise<EstablishmentPhoto> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<EstablishmentPhoto>(`${basePath(tenantId, establishmentId)}/photos`, {
    method: "POST",
    body,
  });
}

export function deletePhoto(tenantId: string, establishmentId: string, photoId: string): Promise<void> {
  return apiFetch<void>(`${basePath(tenantId, establishmentId)}/photos/${photoId}`, {
    method: "DELETE",
  });
}

export function reorderPhotos(
  tenantId: string,
  establishmentId: string,
  photoIds: string[],
): Promise<EstablishmentPhoto[]> {
  return apiFetch<EstablishmentPhoto[]>(`${basePath(tenantId, establishmentId)}/photos/order`, {
    method: "PUT",
    body: JSON.stringify({ photoIds }),
  });
}
