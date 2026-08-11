/**
 * Wall-clock ↔ instant conversion for a named IANA time zone, built on Intl so the project
 * keeps its zero-date-library footprint.
 *
 * Business hours and employee schedules are stored as bare "HH:mm" wall-clock strings. They
 * mean "09:00 where the establishment is", never "09:00 UTC" — getting that wrong shifts every
 * published slot by the establishment's offset.
 */

/** Offset in minutes that `timeZone` is ahead of UTC at the given instant (negative west of
 * Greenwich, e.g. -180 for America/Sao_Paulo). */
function offsetMinutesAt(instant: Date, timeZone: string): number {
  // 'en-CA' yields an ISO-shaped YYYY-MM-DD date, which parses back predictably.
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  // Intl renders hour 24 for midnight under hour12:false in some engines; normalise it.
  const hour = get('hour') % 24;

  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return (asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000;
}

/**
 * The UTC instant at which the given wall-clock time occurs in `timeZone`.
 *
 * Two passes: guess by treating the wall time as UTC, measure the zone's offset around that
 * guess, correct, then re-measure once in case the correction crossed a DST boundary.
 *
 * Ambiguity at DST transitions is resolved by whatever the second pass lands on — good enough
 * for opening hours, which no establishment schedules inside the one hour a year that repeats.
 */
export function zonedWallTimeToUtc(date: string, time: string, timeZone: string): Date {
  const naive = new Date(`${date}T${time}:00.000Z`);
  if (Number.isNaN(naive.getTime())) {
    throw new RangeError(`Data/hora inválida: '${date}T${time}'`);
  }

  let instant = new Date(naive.getTime() - offsetMinutesAt(naive, timeZone) * 60_000);
  instant = new Date(naive.getTime() - offsetMinutesAt(instant, timeZone) * 60_000);
  return instant;
}

/** "HH:mm" for an instant, as read on a clock in `timeZone`. */
export function formatZonedTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).format(instant);
}

/** Day of week (0 = Sunday) of a "YYYY-MM-DD" calendar date. Timezone-independent: the string
 * already names a calendar day, it is not an instant. */
export function calendarWeekday(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}
