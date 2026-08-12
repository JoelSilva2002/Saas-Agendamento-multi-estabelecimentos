import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type NotificationChannel = 'whatsapp' | 'email';
export type NotificationType =
  | 'confirmation'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'cancellation'
  | 'reschedule';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

/** Total send attempts allowed (first attempt + 3 retries) before a `failed` notification is
 * left permanently unretried. Shared between NotificationDispatcherService (decides when a
 * failure is exhausted) and the Prisma repository (filters findRetryable's query). */
export const MAX_NOTIFICATION_ATTEMPTS = 4;

export interface NotificationProps {
  id: string;
  establishmentId: string;
  appointmentId: string;
  recipientUserId: string;
  channel: NotificationChannel;
  type: NotificationType;
  status: NotificationStatus;
  /** Per-occurrence idempotency token: '' for the one-shot types, the new start time for
   * `reschedule`, which legitimately fires again each time the appointment moves. */
  dedupeKey: string;
  message: string;
  errorMessage: string | null;
  /** Number of real send attempts made so far (incremented on every call to the channel
   * adapter, success or failure). */
  attempts: number;
  /** When the retry sweep may try this row again. Null means not eligible: never failed,
   * already sent, or attempts exhausted. */
  nextAttemptAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationProps {
  id: string;
  establishmentId: string;
  appointmentId: string;
  recipientUserId: string;
  channel: NotificationChannel;
  type: NotificationType;
  message: string;
  /** Defaults to '' — the one-shot behaviour every existing type relies on. */
  dedupeKey?: string;
}

export class Notification {
  private constructor(private readonly props: NotificationProps) {}

  static create(props: CreateNotificationProps): Notification {
    if (!props.message || props.message.trim().length === 0) {
      throw new ValidationError('Notification requer uma mensagem não vazia');
    }

    const now = new Date();
    return new Notification({
      id: props.id,
      establishmentId: props.establishmentId,
      appointmentId: props.appointmentId,
      recipientUserId: props.recipientUserId,
      channel: props.channel,
      type: props.type,
      status: 'pending',
      dedupeKey: props.dedupeKey ?? '',
      message: props.message,
      errorMessage: null,
      attempts: 0,
      nextAttemptAt: null,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: NotificationProps): Notification {
    return new Notification(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get appointmentId(): string {
    return this.props.appointmentId;
  }

  get recipientUserId(): string {
    return this.props.recipientUserId;
  }

  get channel(): NotificationChannel {
    return this.props.channel;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get status(): NotificationStatus {
    return this.props.status;
  }

  get message(): string {
    return this.props.message;
  }

  get errorMessage(): string | null {
    return this.props.errorMessage;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  get nextAttemptAt(): Date | null {
    return this.props.nextAttemptAt;
  }

  get sentAt(): Date | null {
    return this.props.sentAt;
  }

  markSent(): Notification {
    return new Notification({
      ...this.props,
      status: 'sent',
      nextAttemptAt: null,
      sentAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /** `nextAttemptAt` is null when attempts are exhausted (or the caller decides this failure
   * isn't worth retrying, e.g. no valid recipient address) — the row then stays `failed`
   * forever, out of the retry sweep's query. */
  markFailed(errorMessage: string, nextAttemptAt: Date | null = null): Notification {
    return new Notification({
      ...this.props,
      status: 'failed',
      errorMessage,
      attempts: this.props.attempts + 1,
      nextAttemptAt,
      updatedAt: new Date(),
    });
  }

  toPersistenceProps(): NotificationProps {
    return { ...this.props };
  }
}
