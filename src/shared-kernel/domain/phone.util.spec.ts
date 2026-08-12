import { toE164BR } from './phone.util';

describe('toE164BR', () => {
  it('normalizes a local mobile number with punctuation', () => {
    expect(toE164BR('(11) 99999-0000')).toBe('5511999990000');
  });

  it('normalizes a local landline number', () => {
    expect(toE164BR('(11) 4000-1234')).toBe('551140001234');
  });

  it('leaves a number that already carries the country code untouched (digits only)', () => {
    expect(toE164BR('+55 11 99999-0000')).toBe('5511999990000');
    expect(toE164BR('5511999990000')).toBe('5511999990000');
  });

  it('rejects an 11-digit local number that is not actually a mobile', () => {
    // Position 3 (the marker digit) isn't '9', so this isn't a valid mobile shape.
    expect(toE164BR('11 88888-0000')).toBeNull();
  });

  it('rejects an implausible area code', () => {
    expect(toE164BR('00 99999-0000')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(toE164BR('')).toBeNull();
    expect(toE164BR('abc')).toBeNull();
    expect(toE164BR('123')).toBeNull();
  });
});
