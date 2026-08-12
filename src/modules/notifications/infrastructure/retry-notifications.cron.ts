import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RetryFailedNotificationsUseCase } from '../application/use-cases/retry-failed-notifications.use-case';

/** Runs independently of RemindersCron — retrying failures is unrelated to scanning for newly
 * due reminders, and the two crons must not block each other. */
@Injectable()
export class RetryNotificationsCron {
  private readonly logger = new Logger(RetryNotificationsCron.name);

  constructor(private readonly retryFailedNotifications: RetryFailedNotificationsUseCase) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron(): Promise<void> {
    try {
      await this.retryFailedNotifications.execute();
    } catch (error) {
      this.logger.error(
        'Falha ao reprocessar notificações pendentes de reenvio',
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
