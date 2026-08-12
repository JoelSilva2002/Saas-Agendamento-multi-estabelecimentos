import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { NotificationDispatcherService } from '../services/notification-dispatcher.service';

/**
 * Sweeps `failed` notifications that are due for another attempt. This is the only thing that
 * retries `confirmation`/`cancellation`/`reschedule` — those are triggered once, synchronously,
 * by an event listener, so nothing else will ever call dispatch() for the same key again.
 * Reminders get a handful of extra chances "for free" from the reminders cron re-scanning the
 * same appointment across nearby ticks, but this sweep is what actually retries them past that.
 *
 * One row failing to retry never stops the sweep from trying the rest — same never-throw
 * discipline as NotificationDispatcherService.dispatch().
 */
@Injectable()
export class RetryFailedNotificationsUseCase {
  private readonly logger = new Logger(RetryFailedNotificationsUseCase.name);

  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  async execute(now: Date = new Date()): Promise<void> {
    const due = await this.notificationRepository.findRetryable(now);
    for (const notification of due) {
      try {
        await this.dispatcher.retry(notification);
      } catch (error) {
        this.logger.error(
          `Falha inesperada ao reprocessar notificação '${notification.id}'`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }
}
