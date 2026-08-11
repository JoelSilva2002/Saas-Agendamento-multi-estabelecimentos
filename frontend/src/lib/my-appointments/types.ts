import type { AppointmentStatus } from "@/lib/appointments/types";

export type MyAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  priceCents: number;
  serviceName: string;
  employeeName: string;
  establishmentName: string;
  establishmentSlug: string;
  timeZone: string;
};

/** Habits derived from a client's own history, used to speed up their next booking. */
export type ClientHabits = {
  favouriteEmployee: { name: string; count: number } | null;
  usualHour: { hour: number; count: number } | null;
  favouriteService: { name: string; count: number } | null;
};
