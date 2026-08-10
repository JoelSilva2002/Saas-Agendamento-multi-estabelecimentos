import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type NotificationChannel = 'whatsapp' | 'email';
export type NotificationType = 'confirmation' | 'reminder_24h' | 'reminder_2h' | 'cancellation';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface NotificationProps {
  id: string;
  establishmentId: string;
  appointmentId: string;
  recipientUserId: string;
  channel: NotificationChannel;
  type: NotificationType;
  status: NotificationStatus;
  message: string;
  errorMessage: string | null;
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
      message: props.message,
      errorMessage: null,
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

  get sentAt(): Date | null {
    return this.props.sentAt;
  }

  markSent(): Notification {
    return new Notification({
      ...this.props,
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date(),
    });
  }

  markFailed(errorMessage: string): Notification {
    return new Notification({
      ...this.props,
      status: 'failed',
      errorMessage,
      updatedAt: new Date(),
    });
  }

  toPersistenceProps(): NotificationProps {
    return { ...this.props };
  }
}
