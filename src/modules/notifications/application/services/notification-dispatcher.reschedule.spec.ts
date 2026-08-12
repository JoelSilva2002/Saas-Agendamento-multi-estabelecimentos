import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';

/**
 * A reschedule notice is the only type that may fire more than once for the same appointment.
 * These cover the dedupeKey behaviour that makes that possible without weakening the
 * idempotency the reminders cron depends on.
 */
describe('NotificationDispatcherService — reschedule', () => {
  const APPOINTMENT_ID = 'appointment-1';
  const CLIENT_ID = 'client-1';

  function build() {
    const stored: Notification[] = [];

    const notificationRepository = {
      create: jest.fn(async (notification: Notification) => {
        stored.push(notification);
        return notification;
      }),
      update: jest.fn(async (notification: Notification) => notification),
      findExisting: jest.fn(
        async (appointmentId: string, type: string, channel: string, dedupeKey: string) =>
          stored.find(
            (n) =>
              n.appointmentId === appointmentId &&
              n.type === type &&
              n.channel === channel &&
              n.toPersistenceProps().dedupeKey === dedupeKey,
          ) ?? null,
      ),
      findRetryable: jest.fn().mockResolvedValue([]),
      findByAppointment: jest.fn(),
    } as unknown as NotificationRepositoryPort;

    const service = new NotificationDispatcherService(
      notificationRepository,
      {
        findById: jest.fn().mockResolvedValue({ id: CLIENT_ID, email: 'cliente@test.local' }),
      } as never,
      { findByUserAndEstablishment: jest.fn().mockResolvedValue(null) } as never,
      { send: jest.fn() } as never,
      { send: jest.fn() } as never,
      {
        findByIdUnscoped: jest.fn().mockResolvedValue({
          name: 'Studio Beleza',
          address: {},
          timezone: 'America/Sao_Paulo',
          notifyEmailEnabled: true,
          notifyWhatsappEnabled: true,
        }),
      } as never,
      { findById: jest.fn().mockResolvedValue(null) } as never,
      { findById: jest.fn().mockResolvedValue(null) } as never,
      { get: jest.fn().mockReturnValue('http://localhost:3001') } as never,
    );

    return { service, stored };
  }

  function dispatchReschedule(service: NotificationDispatcherService, startAt: Date) {
    return service.dispatch({
      type: 'reschedule',
      establishmentId: 'establishment-1',
      appointmentId: APPOINTMENT_ID,
      clientId: CLIENT_ID,
      employeeId: 'employee-1',
      serviceId: 'service-1',
      startAt,
      previousStartAt: new Date('2026-08-20T12:00:00.000Z'),
    });
  }

  it('notifies again when the appointment moves to a different time', async () => {
    const { service, stored } = build();

    await dispatchReschedule(service, new Date('2026-08-21T12:00:00.000Z'));
    await dispatchReschedule(service, new Date('2026-08-22T12:00:00.000Z'));

    expect(stored).toHaveLength(2);
  });

  it('still suppresses a duplicate for the very same new time', async () => {
    const { service, stored } = build();
    const sameTime = new Date('2026-08-21T12:00:00.000Z');

    await dispatchReschedule(service, sameTime);
    await dispatchReschedule(service, sameTime);

    expect(stored).toHaveLength(1);
  });

  it('keeps one-shot types one-shot', async () => {
    const { service, stored } = build();

    const confirmation = {
      type: 'confirmation' as const,
      establishmentId: 'establishment-1',
      appointmentId: APPOINTMENT_ID,
      clientId: CLIENT_ID,
      employeeId: 'employee-1',
      serviceId: 'service-1',
      startAt: new Date('2026-08-21T12:00:00.000Z'),
    };
    await service.dispatch(confirmation);
    // Same appointment, different time — must NOT produce a second confirmation.
    await service.dispatch({ ...confirmation, startAt: new Date('2026-08-22T12:00:00.000Z') });

    expect(stored).toHaveLength(1);
  });

  it('says where the appointment moved from and to', async () => {
    const { service, stored } = build();

    await dispatchReschedule(service, new Date('2026-08-21T12:00:00.000Z'));

    expect(stored[0].message).toContain('remarcado de');
    expect(stored[0].message).toContain('para');
  });
});
