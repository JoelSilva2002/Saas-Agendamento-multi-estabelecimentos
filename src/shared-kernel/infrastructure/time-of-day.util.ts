// @db.Time columns round-trip through Prisma as full JS Dates; only the time-of-day part
// is meaningful, so a fixed arbitrary date is used to carry "HH:mm" in and out.
const TIME_BASE_DATE = '1970-01-01';

export function timeStringToDate(time: string | null): Date | null {
  return time ? new Date(`${TIME_BASE_DATE}T${time}:00.000Z`) : null;
}

export function dateToTimeString(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(11, 16);
}
