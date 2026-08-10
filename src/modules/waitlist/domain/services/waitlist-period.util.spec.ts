import { periodForHour, periodMatches } from './waitlist-period.util';

describe('waitlist-period.util', () => {
  describe('periodForHour', () => {
    it('buckets before noon as morning', () => {
      expect(periodForHour(new Date('2026-03-10T09:00:00.000Z'))).toBe('morning');
    });

    it('buckets 12-18h as afternoon', () => {
      expect(periodForHour(new Date('2026-03-10T14:00:00.000Z'))).toBe('afternoon');
    });

    it('buckets 18h and later as evening', () => {
      expect(periodForHour(new Date('2026-03-10T19:00:00.000Z'))).toBe('evening');
    });
  });

  describe('periodMatches', () => {
    it('"any" matches every period', () => {
      expect(periodMatches('any', 'morning')).toBe(true);
      expect(periodMatches('any', 'evening')).toBe(true);
    });

    it('matches only the exact period otherwise', () => {
      expect(periodMatches('morning', 'morning')).toBe(true);
      expect(periodMatches('morning', 'evening')).toBe(false);
    });
  });
});
