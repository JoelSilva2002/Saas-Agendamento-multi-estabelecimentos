import { Notification } from './notification.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

function buildNotification(): Notification {
  return Notification.create({
    id: 'notification-1',
    establishmentId: 'establishment-1',
    appointmentId: 'appointment-1',
    recipientUserId: 'client-1',
    channel: 'email',
    type: 'confirmation',
    message: 'Seu agendamento foi confirmado.',
  });
}

describe('Notification', () => {
  it('creates a pending notification', () => {
    const notification = buildNotification();
    expect(notification.status).toBe('pending');
    expect(notification.sentAt).toBeNull();
    expect(notification.errorMessage).toBeNull();
  });

  it('rejects an empty message', () => {
    expect(() =>
      Notification.create({
        id: 'notification-1',
        establishmentId: 'establishment-1',
        appointmentId: 'appointment-1',
        recipientUserId: 'client-1',
        channel: 'email',
        type: 'confirmation',
        message: '   ',
      }),
    ).toThrow(ValidationError);
  });

  it('markSent() sets status and sentAt', () => {
    const sent = buildNotification().markSent();
    expect(sent.status).toBe('sent');
    expect(sent.sentAt).toBeInstanceOf(Date);
  });

  it('markFailed() sets status and errorMessage', () => {
    const failed = buildNotification().markFailed('timeout');
    expect(failed.status).toBe('failed');
    expect(failed.errorMessage).toBe('timeout');
  });
});
