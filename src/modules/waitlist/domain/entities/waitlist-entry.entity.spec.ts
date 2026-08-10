import { WaitlistEntry } from './waitlist-entry.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

function buildEntry(): WaitlistEntry {
  return WaitlistEntry.create({
    id: 'entry-1',
    establishmentId: 'establishment-1',
    clientId: 'client-1',
    serviceId: 'service-1',
    desiredDate: new Date('2026-03-10T00:00:00.000Z'),
  });
}

describe('WaitlistEntry', () => {
  it('creates a waiting entry defaulting desiredPeriod to any', () => {
    const entry = buildEntry();
    expect(entry.status).toBe('waiting');
    expect(entry.desiredPeriod).toBe('any');
    expect(entry.employeeId).toBeNull();
  });

  it('rejects missing required fields', () => {
    expect(() =>
      WaitlistEntry.create({
        id: 'entry-1',
        establishmentId: '',
        clientId: 'client-1',
        serviceId: 'service-1',
        desiredDate: new Date(),
      }),
    ).toThrow(ValidationError);
  });

  it('markNotified() transitions waiting to notified', () => {
    const entry = buildEntry();
    expect(entry.markNotified().status).toBe('notified');
  });

  it('cancel() transitions waiting to cancelled', () => {
    const entry = buildEntry();
    expect(entry.cancel().status).toBe('cancelled');
  });

  it('rejects transitioning an entry that is no longer waiting', () => {
    const notified = buildEntry().markNotified();
    expect(() => notified.cancel()).toThrow(ValidationError);
  });
});
