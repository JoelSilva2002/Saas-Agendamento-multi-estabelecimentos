import { Notification as PrismaNotification } from '@prisma/client';
import { Notification } from '../../domain/entities/notification.entity';

export class NotificationMapper {
  static toDomain(record: PrismaNotification): Notification {
    return Notification.fromPersistence({
      id: record.id,
      establishmentId: record.establishmentId,
      appointmentId: record.appointmentId,
      recipientUserId: record.recipientUserId,
      channel: record.channel,
      type: record.type,
      status: record.status,
      dedupeKey: record.dedupeKey,
      message: record.message,
      errorMessage: record.errorMessage,
      sentAt: record.sentAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
