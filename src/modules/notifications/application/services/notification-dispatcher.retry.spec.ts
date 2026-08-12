import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { EmailNotifierPort } from '../../domain/email-notifier.port';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { MAX_NOTIFICATION_ATTEMPTS, Notification } from '../../domain/entities/notification.entity';

/** Covers NotificationDispatcherService.retry() — the path the retry sweep cron drives, as
 * opposed to dispatch()'s first-attempt path covered elsewhere. */
describe('NotificationDispatcherService — retry', () => {
  const client = User.create({
    id: 'client-1',
    email: 'client@test.local',
    passwordHash: 'hash',
    firstName: 'Cliente',
    lastName: 'Teste',
  });

  function buildFailedNotification(attempts: number): Notification {
    let notification = Notification.create({
      id: 'notification-1',
      establishmentId: 'establishment-1',
      appointmentId: 'appointment-1',
      recipientUserId: 'client-1',
      channel: 'email',
      type: 'confirmation',
      message: 'Seu agendamento foi confirmado.',
    });
    for (let i = 0; i < attempts; i++) {
      notification = notification.markFailed('erro anterior');
    }
    return notification;
  }

  function build(overrides?: {
    userRepository?: Partial<UserRepositoryPort>;
    emailNotifier?: Partial<EmailNotifierPort>;
  }) {
    const notificationRepository: NotificationRepositoryPort = {
      findExisting: jest.fn().mockResolvedValue(null),
      findRetryable: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn().mockImplementation((n: Notification) => Promise.resolve(n)),
      findByAppointment: jest.fn().mockResolvedValue([]),
    } as unknown as NotificationRepositoryPort;

    const userRepository: UserRepositoryPort = {
      findById: jest.fn().mockResolvedValue(client),
      ...overrides?.userRepository,
    } as unknown as UserRepositoryPort;

    const emailNotifier: EmailNotifierPort = {
      send: jest.fn().mockResolvedValue(undefined),
      ...overrides?.emailNotifier,
    } as unknown as EmailNotifierPort;

    const service = new NotificationDispatcherService(
      notificationRepository,
      userRepository,
      emailNotifier,
      {
        findByIdUnscoped: jest.fn().mockResolvedValue({
          timezone: 'America/Sao_Paulo',
          notifyEmailEnabled: true,
        }),
      } as never,
      // retry() never touches service/employee/config — dispatch() is what needs them.
      {} as never,
      {} as never,
      {} as never,
    );

    return { service, notificationRepository, emailNotifier };
  }

  it('marks the row sent when the retry succeeds', async () => {
    const { service, notificationRepository, emailNotifier } = build();
    const notification = buildFailedNotification(1);

    await service.retry(notification);

    expect(emailNotifier.send).toHaveBeenCalledWith(
      'client@test.local',
      expect.any(String),
      expect.objectContaining({ html: expect.any(String), text: expect.any(String) }),
    );
    const updated = (notificationRepository.update as jest.Mock).mock.calls[0][0] as Notification;
    expect(updated.status).toBe('sent');
  });

  it('schedules another attempt with backoff when it fails again but is not yet exhausted', async () => {
    const { service, notificationRepository } = build({
      emailNotifier: { send: jest.fn().mockRejectedValue(new Error('still down')) },
    });
    const notification = buildFailedNotification(1);
    const before = Date.now();

    await service.retry(notification);

    const updated = (notificationRepository.update as jest.Mock).mock.calls[0][0] as Notification;
    expect(updated.status).toBe('failed');
    expect(updated.attempts).toBe(2);
    expect(updated.nextAttemptAt).not.toBeNull();
    expect(updated.nextAttemptAt!.getTime()).toBeGreaterThan(before);
  });

  it('leaves nextAttemptAt null once attempts are exhausted', async () => {
    const { service, notificationRepository } = build({
      emailNotifier: { send: jest.fn().mockRejectedValue(new Error('still down')) },
    });
    // Already failed MAX_NOTIFICATION_ATTEMPTS - 1 times; this retry is the last one allowed.
    const notification = buildFailedNotification(MAX_NOTIFICATION_ATTEMPTS - 1);

    await service.retry(notification);

    const updated = (notificationRepository.update as jest.Mock).mock.calls[0][0] as Notification;
    expect(updated.attempts).toBe(MAX_NOTIFICATION_ATTEMPTS);
    expect(updated.nextAttemptAt).toBeNull();
  });

  it('gives up permanently, without calling the channel, when the recipient user no longer exists', async () => {
    const { service, notificationRepository, emailNotifier } = build({
      userRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    const notification = buildFailedNotification(1);

    await service.retry(notification);

    expect(emailNotifier.send).not.toHaveBeenCalled();
    const updated = (notificationRepository.update as jest.Mock).mock.calls[0][0] as Notification;
    expect(updated.status).toBe('failed');
    expect(updated.nextAttemptAt).toBeNull();
  });
});
