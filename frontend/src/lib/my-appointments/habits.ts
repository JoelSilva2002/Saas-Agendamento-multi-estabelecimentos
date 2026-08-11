import type { ClientHabits, MyAppointment } from "./types";

/** Appointments the client actually showed up for — cancellations and no-shows say nothing
 * about what they prefer. */
function meaningful(appointments: MyAppointment[]): MyAppointment[] {
  return appointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
}

function mostCommon<T>(values: T[]): { value: T; count: number } | null {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let best: { value: T; count: number } | null = null;
  for (const [value, count] of counts) {
    if (!best || count > best.count) best = { value, count };
  }
  // A single visit is history, not a habit.
  return best && best.count > 1 ? best : null;
}

/** The hour the client tends to book, read in the establishment's own zone. */
function hourIn(appointment: MyAppointment): number {
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: appointment.timeZone,
    hour12: false,
    hour: "2-digit",
  }).format(new Date(appointment.startAt));
  return Number(label) % 24;
}

export function deriveHabits(appointments: MyAppointment[]): ClientHabits {
  const relevant = meaningful(appointments);

  const employee = mostCommon(relevant.map((a) => a.employeeName));
  const hour = mostCommon(relevant.map(hourIn));
  const service = mostCommon(relevant.map((a) => a.serviceName));

  return {
    favouriteEmployee: employee ? { name: employee.value, count: employee.count } : null,
    usualHour: hour ? { hour: hour.value, count: hour.count } : null,
    favouriteService: service ? { name: service.value, count: service.count } : null,
  };
}
