import { computeCheckInToken, verifyCheckInToken } from './checkin-token.util';

describe('checkin-token.util', () => {
  const secret = 'test-secret';

  it('produces a deterministic token for the same appointmentId and secret', () => {
    const tokenA = computeCheckInToken('appointment-1', secret);
    const tokenB = computeCheckInToken('appointment-1', secret);
    expect(tokenA).toBe(tokenB);
  });

  it('produces different tokens for different appointments', () => {
    expect(computeCheckInToken('appointment-1', secret)).not.toBe(
      computeCheckInToken('appointment-2', secret),
    );
  });

  it('verifies a correctly computed token', () => {
    const token = computeCheckInToken('appointment-1', secret);
    expect(verifyCheckInToken('appointment-1', token, secret)).toBe(true);
  });

  it('rejects a token computed for a different appointment', () => {
    const token = computeCheckInToken('appointment-2', secret);
    expect(verifyCheckInToken('appointment-1', token, secret)).toBe(false);
  });

  it('rejects a token computed with a different secret', () => {
    const token = computeCheckInToken('appointment-1', 'other-secret');
    expect(verifyCheckInToken('appointment-1', token, secret)).toBe(false);
  });

  it('rejects a malformed/garbage token without throwing', () => {
    expect(verifyCheckInToken('appointment-1', 'not-a-real-token', secret)).toBe(false);
  });
});
