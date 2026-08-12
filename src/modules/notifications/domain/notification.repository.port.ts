import {
  Notification,
  NotificationChannel,
  NotificationType,
} from './entities/notification.entity';

export abstract class NotificationRepositoryPort {
  abstract create(notification: Notification): Promise<Notification>;
  abstract update(notification: Notification): Promise<Notification>;

  /** Idempotency lookup used by the event listeners and the reminders cron before dispatching
   * — mirrors the DB's unique (appointmentId, type, channel, dedupeKey) constraint. A non-null
   * result (of any status) means the trigger side must not create another row for this key;
   * only the retry sweep (see findRetryable) is allowed to act on an existing `failed` row. */
  abstract findExisting(
    appointmentId: string,
    type: NotificationType,
    channel: NotificationChannel,
    dedupeKey: string,
  ): Promise<Notification | null>;

  /** `failed` rows still within their retry budget (attempts < MAX_ATTEMPTS) and due
   * (nextAttemptAt <= now) — scanned periodically by the retry sweep cron. */
  abstract findRetryable(now: Date): Promise<Notification[]>;

  abstract findByAppointment(appointmentId: string): Promise<Notification[]>;
}
