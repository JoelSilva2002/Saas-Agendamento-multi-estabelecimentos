import { zonedWallTimeToUtc } from '../../../../shared-kernel/domain/timezone.util';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface DayBusinessHours {
  isClosed: boolean;
  openTime: string | null; // "HH:mm"
  closeTime: string | null; // "HH:mm"
}

export interface DayScheduleSlot {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface AvailabilityContext {
  /** The calendar date this context applies to, "YYYY-MM-DD". */
  date: string;
  /** IANA zone the establishment operates in. Business hours and schedule slots are bare
   * wall-clock strings; they only become instants once read against this zone. */
  timeZone: string;
  businessHours: DayBusinessHours;
  workingSlots: DayScheduleSlot[];
  breakSlots: DayScheduleSlot[];
  /** Employee time off ranges that overlap `date` (already real Date instants). */
  timeOffRanges: TimeRange[];
  /** Existing active appointments for this employee on this date, each already expanded
   * by ITS OWN service's buffer — busyRanges are what nothing else may overlap. */
  busyRanges: TimeRange[];
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  /** Grid step for candidate start times, in minutes. */
  slotIntervalMinutes: number;
  /** When provided, candidates starting before `now` are excluded (used when `date` is
   * today). */
  now?: Date;
}

export interface AvailableSlot {
  startAt: Date;
  endAt: Date;
}

const MINUTE_MS = 60_000;

function timeToDate(date: string, time: string, timeZone: string): Date {
  return zonedWallTimeToUtc(date, time, timeZone);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

function intersect(a: TimeRange, b: TimeRange): TimeRange | null {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  return start < end ? { start, end } : null;
}

/** Removes `cut` from every window in `windows`, splitting a window into up to two pieces
 * when `cut` falls strictly inside it. Windows untouched by `cut` pass through unchanged. */
function subtractInterval(windows: TimeRange[], cut: TimeRange): TimeRange[] {
  const result: TimeRange[] = [];
  for (const window of windows) {
    if (cut.end <= window.start || cut.start >= window.end) {
      result.push(window);
      continue;
    }
    if (cut.start > window.start) {
      result.push({ start: window.start, end: cut.start });
    }
    if (cut.end < window.end) {
      result.push({ start: cut.end, end: window.end });
    }
  }
  return result;
}

export class AvailabilityCalculator {
  /** Every genuinely free window for the day, after intersecting business hours with the
   * employee's working slots and subtracting breaks, time off and existing busy ranges —
   * the shared basis for both public methods below. */
  private static computeFreeWindows(context: AvailabilityContext): TimeRange[] {
    const { businessHours, date, timeZone } = context;
    if (businessHours.isClosed || !businessHours.openTime || !businessHours.closeTime) {
      return [];
    }
    if (context.workingSlots.length === 0) {
      return [];
    }

    const businessHoursRange: TimeRange = {
      start: timeToDate(date, businessHours.openTime, timeZone),
      end: timeToDate(date, businessHours.closeTime, timeZone),
    };

    let windows = context.workingSlots
      .map((slot) =>
        intersect(
          {
            start: timeToDate(date, slot.startTime, timeZone),
            end: timeToDate(date, slot.endTime, timeZone),
          },
          businessHoursRange,
        ),
      )
      .filter((window): window is TimeRange => window !== null);

    const cuts = [
      ...context.breakSlots.map((slot) => ({
        start: timeToDate(date, slot.startTime, timeZone),
        end: timeToDate(date, slot.endTime, timeZone),
      })),
      ...context.timeOffRanges,
      ...context.busyRanges,
    ];

    for (const cut of cuts) {
      windows = subtractInterval(windows, cut);
    }

    return windows.filter((window) => window.start < window.end);
  }

  static computeAvailableSlots(context: AvailabilityContext): AvailableSlot[] {
    const freeWindows = this.computeFreeWindows(context);
    const slots: AvailableSlot[] = [];

    for (const window of freeWindows) {
      let candidateStart = window.start;
      while (candidateStart < window.end) {
        const candidateEnd = addMinutes(candidateStart, context.durationMinutes);
        const occupiedStart = addMinutes(candidateStart, -context.bufferBeforeMinutes);
        const occupiedEnd = addMinutes(candidateEnd, context.bufferAfterMinutes);

        const fitsWindow = occupiedStart >= window.start && occupiedEnd <= window.end;
        const isInFuture = !context.now || candidateStart >= context.now;

        if (fitsWindow && isInFuture) {
          slots.push({ startAt: candidateStart, endAt: candidateEnd });
        }

        candidateStart = addMinutes(candidateStart, context.slotIntervalMinutes);
      }
    }

    return slots;
  }

  static isRangeAvailable(context: AvailabilityContext, candidateStart: Date, candidateEnd: Date): boolean {
    const freeWindows = this.computeFreeWindows(context);
    const occupiedStart = addMinutes(candidateStart, -context.bufferBeforeMinutes);
    const occupiedEnd = addMinutes(candidateEnd, context.bufferAfterMinutes);

    return freeWindows.some((window) => occupiedStart >= window.start && occupiedEnd <= window.end);
  }
}
