// Local-calendar-day helpers. Deliberately avoid toISOString() for date keys
// since it converts to UTC first and can shift the day near midnight in
// timezones behind UTC.
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nextDays(count: number, from: Date = new Date()): Date[] {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
const MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

export function formatWeekday(date: Date): string {
  return WEEKDAY_FORMATTER.format(date).replace(".", "");
}

export function formatMonthShort(date: Date): string {
  return MONTH_FORMATTER.format(date).replace(".", "");
}

/**
 * Times must be shown in the establishment's zone, not the visitor's: a client browsing from
 * another state has to read the hour the salon will actually expect them, and the slot instants
 * the API returns were computed against that zone. Falls back to the browser's zone only when
 * the caller has no establishment context.
 */
export function formatTime(iso: string, timeZone?: string): string {
  if (!timeZone) return TIME_FORMATTER.format(new Date(iso));
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Full date of an instant, read in the establishment's zone — near midnight the calendar day
 * differs between zones, so this cannot reuse the date-key formatter. */
export function formatFullDateFromInstant(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    ...(timeZone ? { timeZone } : {}),
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(iso));
}

export function formatFullDate(dateKey: string): string {
  return FULL_DATE_FORMATTER.format(new Date(`${dateKey}T00:00:00`));
}

export function toTimeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
