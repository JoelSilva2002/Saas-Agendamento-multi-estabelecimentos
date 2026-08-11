import { apiFetch } from "@/lib/api/client";
import type {
  PublicEmployee,
  PublicEstablishment,
  PublicEstablishmentDetail,
  PublicService,
  PublicSlot,
  SearchEstablishmentsParams,
} from "./types";

// Every call here is unauthenticated by design: these back the pages a visitor sees before
// deciding to sign up. apiFetch simply omits the Authorization header when there is no token.

export function listCities(): Promise<string[]> {
  return apiFetch<string[]>("/public/cities");
}

export function searchEstablishments(
  params: SearchEstablishmentsParams = {},
): Promise<PublicEstablishment[]> {
  const query = new URLSearchParams();
  if (params.city) query.set("city", params.city);
  if (params.search) query.set("search", params.search);
  const qs = query.toString();
  return apiFetch<PublicEstablishment[]>(`/public/establishments${qs ? `?${qs}` : ""}`);
}

export function getEstablishment(slug: string): Promise<PublicEstablishmentDetail> {
  return apiFetch<PublicEstablishmentDetail>(`/public/establishments/${slug}`);
}

export function listServices(slug: string): Promise<PublicService[]> {
  return apiFetch<PublicService[]>(`/public/establishments/${slug}/services`);
}

export function listEligibleEmployees(slug: string, serviceId: string): Promise<PublicEmployee[]> {
  return apiFetch<PublicEmployee[]>(
    `/public/establishments/${slug}/services/${serviceId}/employees`,
  );
}

export function listAvailableSlots(
  slug: string,
  params: { serviceId: string; employeeId: string; date: string },
): Promise<PublicSlot[]> {
  const query = new URLSearchParams(params);
  return apiFetch<PublicSlot[]>(`/public/establishments/${slug}/availability?${query.toString()}`);
}
