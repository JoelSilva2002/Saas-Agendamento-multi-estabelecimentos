import { RetryFailedNotificationsUseCase } from './retry-failed-notifications.use-case';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { NotificationDispatcherService } from '../services/notification-dispatcher.service';
import { Notification } from '../../domain/entities/notification.entity';

describe('RetryFailedNotificationsUseCase', () => {
  function buildNotification(id: string): Notification {
    return Notification.create({
      id,
      establishmentId: 'establishment-1',
      appointmentId: 'appointment-1',
      recipientUserId: 'client-1',
      channel: 'email',
      type: 'confirmation',
      message: 'Seu agendamento foi confirmado.',
    });
  }

  it('retries every row the repository reports as due', async () => {
    const due = [buildNotification('n1'), buildNotification('n2')];
    const notificationRepository = {
      findRetryable: jest.fn().mockResolvedValue(due),
    } as unknown as NotificationRepositoryPort;
    const dispatcher = { retry: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationDispatcherService;

    const useCase = new RetryFailedNotificationsUseCase(notificationRepository, dispatcher);
    const now = new Date('2026-03-10T10:00:00.000Z');
    await useCase.execute(now);

    expect(notificationRepository.findRetryable).toHaveBeenCalledWith(now);
    expect(dispatcher.retry).toHaveBeenCalledTimes(2);
    expect(dispatcher.retry).toHaveBeenCalledWith(due[0]);
    expect(dispatcher.retry).toHaveBeenCalledWith(due[1]);
  });

  it('keeps going when one retry throws, without propagating', async () => {
    const due = [buildNotification('n1'), buildNotification('n2')];
    const notificationRepository = {
      findRetryable: jest.fn().mockResolvedValue(due),
    } as unknown as NotificationRepositoryPort;
    const retry = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    const dispatcher = { retry } as unknown as NotificationDispatcherService;

    const useCase = new RetryFailedNotificationsUseCase(notificationRepository, dispatcher);

    await expect(useCase.execute()).resolves.toBeUndefined();
    expect(retry).toHaveBeenCalledTimes(2);
  });
});
