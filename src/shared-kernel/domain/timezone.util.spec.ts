import { calendarWeekday, formatZonedTime, zonedWallTimeToUtc } from './timezone.util';

describe('zonedWallTimeToUtc', () => {
  it('resolves a wall time in a fixed-offset zone', () => {
    // America/Sao_Paulo has had no DST since 2019: always UTC-3.
    const instant = zonedWallTimeToUtc('2026-08-14', '09:00', 'America/Sao_Paulo');
    expect(instant.toISOString()).toBe('2026-08-14T12:00:00.000Z');
  });

  it('treats UTC as a no-op', () => {
    const instant = zonedWallTimeToUtc('2026-08-14', '09:00', 'UTC');
    expect(instant.toISOString()).toBe('2026-08-14T09:00:00.000Z');
  });

  it('handles a zone ahead of UTC', () => {
    const instant = zonedWallTimeToUtc('2026-08-14', '09:00', 'Europe/Lisbon');
    // Lisbon is UTC+1 in August (WEST).
    expect(instant.toISOString()).toBe('2026-08-14T08:00:00.000Z');
  });

  it('respects a DST change within the same zone', () => {
    // Lisbon is UTC+0 in January, UTC+1 in August — same wall time, different instants.
    const winter = zonedWallTimeToUtc('2026-01-14', '09:00', 'Europe/Lisbon');
    const summer = zonedWallTimeToUtc('2026-08-14', '09:00', 'Europe/Lisbon');
    expect(winter.toISOString()).toBe('2026-01-14T09:00:00.000Z');
    expect(summer.toISOString()).toBe('2026-08-14T08:00:00.000Z');
  });

  it('round-trips through formatZonedTime', () => {
    const instant = zonedWallTimeToUtc('2026-08-14', '18:30', 'America/Sao_Paulo');
    expect(formatZonedTime(instant, 'America/Sao_Paulo')).toBe('18:30');
  });

  it('resolves midnight without rolling the day', () => {
    const instant = zonedWallTimeToUtc('2026-08-14', '00:00', 'America/Sao_Paulo');
    expect(instant.toISOString()).toBe('2026-08-14T03:00:00.000Z');
    expect(formatZonedTime(instant, 'America/Sao_Paulo')).toBe('00:00');
  });
});

describe('calendarWeekday', () => {
  it('reads the weekday of a calendar date', () => {
    expect(calendarWeekday('2026-08-14')).toBe(5); // sexta-feira
    expect(calendarWeekday('2026-08-16')).toBe(0); // domingo
  });
});
