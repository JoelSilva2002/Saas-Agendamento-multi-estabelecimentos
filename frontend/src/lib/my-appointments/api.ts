import { apiFetch } from "@/lib/api/client";
import type { MyAppointment } from "./types";

/** The signed-in client's bookings across every establishment they have used. */
export function listMyAppointments(): Promise<MyAppointment[]> {
  return apiFetch<MyAppointment[]>("/me/appointments");
}

/**
 * Registers the signed-in user as a client of this establishment, if they are not already.
 *
 * An account created from the login page carries no tenant grant, so its first booking would
 * be rejected by the tenant scope guard. Idempotent, so the booking flow just always calls it.
 */
export function joinEstablishment(slug: string): Promise<void> {
  return apiFetch<void>(`/me/establishments/${slug}/join`, { method: "POST" });
}
