import { WaitlistPeriod } from '../entities/waitlist-entry.entity';

/** Buckets a Date's UTC hour into the same coarse morning/afternoon/evening split used by
 * WaitlistEntry.desiredPeriod, so a cancelled appointment's time-of-day can be matched
 * against what waiting clients asked for. Same "naive" UTC-as-local-time simplification
 * already used everywhere else in this codebase (see business-hours/schedule handling). */
export function periodForHour(date: Date): Exclude<WaitlistPeriod, 'any'> {
  const hour = date.getUTCHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function periodMatches(
  desiredPeriod: WaitlistPeriod,
  actualPeriod: Exclude<WaitlistPeriod, 'any'>,
): boolean {
  return desiredPeriod === 'any' || desiredPeriod === actualPeriod;
}
