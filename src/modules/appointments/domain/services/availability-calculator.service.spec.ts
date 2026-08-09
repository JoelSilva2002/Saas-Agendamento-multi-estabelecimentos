import { AvailabilityCalculator, AvailabilityContext } from './availability-calculator.service';

describe('AvailabilityCalculator', () => {
  const DATE = '2026-03-10'; // a Tuesday, not otherwise significant

  function at(time: string): Date {
    return new Date(`${DATE}T${time}:00.000Z`);
  }

  function baseContext(overrides?: Partial<AvailabilityContext>): AvailabilityContext {
    return {
      date: DATE,
      businessHours: { isClosed: false, openTime: '09:00', closeTime: '18:00' },
      workingSlots: [{ startTime: '09:00', endTime: '18:00' }],
      breakSlots: [],
      timeOffRanges: [],
      busyRanges: [],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      slotIntervalMinutes: 30,
      ...overrides,
    };
  }

  it('returns no slots when the establishment is closed that day', () => {
    const context = baseContext({ businessHours: { isClosed: true, openTime: null, closeTime: null } });
    expect(AvailabilityCalculator.computeAvailableSlots(context)).toEqual([]);
  });

  it('returns no slots when the employee has no working slots that day', () => {
    const context = baseContext({ workingSlots: [] });
    expect(AvailabilityCalculator.computeAvailableSlots(context)).toEqual([]);
  });

  it('intersects business hours with the employee working slot', () => {
    // establishment opens 09:00-18:00, but the employee only works 10:00-14:00
    const context = baseContext({ workingSlots: [{ startTime: '10:00', endTime: '14:00' }] });
    const slots = AvailabilityCalculator.computeAvailableSlots(context);
    expect(slots[0].startAt).toEqual(at('10:00'));
    expect(slots[slots.length - 1].endAt <= at('14:00')).toBe(true);
    expect(slots.every((s) => s.startAt >= at('10:00'))).toBe(true);
  });

  it('excludes the lunch break window', () => {
    const context = baseContext({ breakSlots: [{ startTime: '12:00', endTime: '13:00' }] });
    const slots = AvailabilityCalculator.computeAvailableSlots(context);
    const overlapsLunch = slots.some((s) => s.startAt < at('13:00') && s.endAt > at('12:00'));
    expect(overlapsLunch).toBe(false);
    // slots right before and after lunch should still exist
    expect(slots.some((s) => s.startAt.getTime() === at('11:30').getTime())).toBe(true);
    expect(slots.some((s) => s.startAt.getTime() === at('13:00').getTime())).toBe(true);
  });

  it('excludes a full-day time off', () => {
    const context = baseContext({
      timeOffRanges: [{ start: at('00:00'), end: new Date(`2026-03-11T00:00:00.000Z`) }],
    });
    expect(AvailabilityCalculator.computeAvailableSlots(context)).toEqual([]);
  });

  it('excludes an existing appointment expanded by its own service buffer', () => {
    const context = baseContext({
      // appointment 10:00-10:30 with a 15-min buffer on both sides -> busy 09:45-10:45
      busyRanges: [{ start: at('09:45'), end: at('10:45') }],
    });
    const slots = AvailabilityCalculator.computeAvailableSlots(context);
    const overlapsBusy = slots.some((s) => s.startAt < at('10:45') && s.endAt > at('09:45'));
    expect(overlapsBusy).toBe(false);
    expect(slots.some((s) => s.startAt.getTime() === at('10:45').getTime())).toBe(true);
  });

  it('keeps the candidate’s own buffer inside the free window on both ends', () => {
    const context = baseContext({
      workingSlots: [{ startTime: '09:00', endTime: '10:00' }],
      durationMinutes: 30,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      slotIntervalMinutes: 15,
    });
    const slots = AvailabilityCalculator.computeAvailableSlots(context);
    // window is 09:00-10:00 (60 min); each candidate needs 10+30+10=50 min of room.
    // 09:00 -> occupies 08:50-09:40 -> 08:50 < window.start(09:00) -> invalid
    // 09:15 -> occupies 09:05-09:55 -> fits -> valid
    // 09:30 -> occupies 09:20-10:10 -> 10:10 > window.end(10:00) -> invalid
    expect(slots.map((s) => s.startAt.getTime())).toEqual([at('09:15').getTime()]);
  });

  it('leaves the correct gap between two consecutive services with buffers', () => {
    // First booking: 09:00-09:30, service buffer after = 15 min -> busy until 09:45.
    const context = baseContext({
      busyRanges: [{ start: at('09:00'), end: at('09:45') }],
      bufferBeforeMinutes: 10,
      slotIntervalMinutes: 5,
    });
    const slots = AvailabilityCalculator.computeAvailableSlots(context);
    // next candidate must start no earlier than 09:55 (09:45 busy-end + 10 min own buffer-before)
    const earliest = slots[0].startAt;
    expect(earliest.getTime()).toBe(at('09:55').getTime());
  });

  it('isRangeAvailable returns false for a conflicting candidate and true for a free one', () => {
    const context = baseContext({ busyRanges: [{ start: at('10:00'), end: at('10:30') }] });
    expect(AvailabilityCalculator.isRangeAvailable(context, at('10:00'), at('10:30'))).toBe(false);
    expect(AvailabilityCalculator.isRangeAvailable(context, at('11:00'), at('11:30'))).toBe(true);
  });

  it('filters out past slots when now falls within the working window', () => {
    const context = baseContext({ now: at('12:00') });
    const slots = AvailabilityCalculator.computeAvailableSlots(context);
    expect(slots.every((s) => s.startAt >= at('12:00'))).toBe(true);
    expect(slots.some((s) => s.startAt.getTime() === at('12:00').getTime())).toBe(true);
  });

  it('handles a split shift as two independent working windows', () => {
    const context = baseContext({
      workingSlots: [
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '14:00', endTime: '18:00' },
      ],
      slotIntervalMinutes: 60,
    });
    const slots = AvailabilityCalculator.computeAvailableSlots(context);
    const overlapsGap = slots.some((s) => s.startAt < at('14:00') && s.endAt > at('12:00'));
    expect(overlapsGap).toBe(false);
    expect(slots.some((s) => s.startAt.getTime() === at('09:00').getTime())).toBe(true);
    expect(slots.some((s) => s.startAt.getTime() === at('14:00').getTime())).toBe(true);
  });
});
