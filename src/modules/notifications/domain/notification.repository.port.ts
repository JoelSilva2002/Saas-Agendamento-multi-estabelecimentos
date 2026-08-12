import {
  Notification,
  NotificationChannel,
  NotificationType,
} from './entities/notification.entity';

export abstract class NotificationRepositoryPort {
  abstract create(notification: Notification): Promise<Notification>;
  abstract update(notification: Notification): Promise<Notification>;

  /** Idempotency check used by both the event listeners and the reminders cron before
   * dispatching — mirrors the DB's unique (appointmentId, type, channel, dedupeKey)
   * constraint so callers get a clean boolean instead of catching a unique-violation error. */
  abstract existsForAppointment(
    appointmentId: string,
    type: NotificationType,
    channel: NotificationChannel,
    dedupeKey: string,
  ): Promise<boolean>;

  abstract findByAppointment(appointmentId: string): Promise<Notification[]>;
}
