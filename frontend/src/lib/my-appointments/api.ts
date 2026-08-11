import { apiFetch } from "@/lib/api/client";
import type { MyAppointment } from "./types";

/** The signed-in client's bookings across every establishment they have used. */
export function listMyAppointments(): Promise<MyAppointment[]> {
  return apiFetch<MyAppointment[]>("/me/appointments");
}
