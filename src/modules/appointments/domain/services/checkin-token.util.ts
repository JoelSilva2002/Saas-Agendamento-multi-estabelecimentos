import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Deterministic HMAC-SHA256 token binding a check-in code to one appointment — no expiry of
 * its own (see Appointment.checkIn(), whose status-transition guard is what makes a token
 * effectively single-use). Pure function, no I/O: reused directly by the controller to mint
 * the token and by CheckInAppointmentUseCase to verify it.
 */
export function computeCheckInToken(appointmentId: string, secret: string): string {
  return createHmac('sha256', secret).update(appointmentId).digest('hex');
}

export function verifyCheckInToken(appointmentId: string, token: string, secret: string): boolean {
  const expected = computeCheckInToken(appointmentId, secret);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(token, 'hex');
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
