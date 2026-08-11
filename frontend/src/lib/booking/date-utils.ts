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

export function formatTime(iso: string): string {
  return TIME_FORMATTER.format(new Date(iso));
}

export function formatFullDate(dateKey: string): string {
  return FULL_DATE_FORMATTER.format(new Date(`${dateKey}T00:00:00`));
}

export function toTimeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
