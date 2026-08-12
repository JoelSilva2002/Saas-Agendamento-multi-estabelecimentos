import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import {
  MAX_NOTIFICATION_ATTEMPTS,
  Notification,
  NotificationChannel,
  NotificationType,
} from '../../domain/entities/notification.entity';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { NotificationMapper } from './notification.mapper';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(notification: Notification): Promise<Notification> {
    const created = await this.prisma.notification.create({
      data: notification.toPersistenceProps(),
    });
    return NotificationMapper.toDomain(created);
  }

  async update(notification: Notification): Promise<Notification> {
    const props = notification.toPersistenceProps();
    const updated = await this.prisma.notification.update({
      where: { id: props.id },
      data: {
        status: props.status,
        errorMessage: props.errorMessage,
        attempts: props.attempts,
        nextAttemptAt: props.nextAttemptAt,
        sentAt: props.sentAt,
      },
    });
    return NotificationMapper.toDomain(updated);
  }

  async findExisting(
    appointmentId: string,
    type: NotificationType,
    channel: NotificationChannel,
    dedupeKey: string,
  ): Promise<Notification | null> {
    const found = await this.prisma.notification.findFirst({
      where: { appointmentId, type, channel, dedupeKey },
    });
    return found ? NotificationMapper.toDomain(found) : null;
  }

  async findRetryable(now: Date): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: {
        status: 'failed',
        attempts: { lt: MAX_NOTIFICATION_ATTEMPTS },
        nextAttemptAt: { lte: now },
      },
      orderBy: { nextAttemptAt: 'asc' },
    });
    return records.map(NotificationMapper.toDomain);
  }

  async findByAppointment(appointmentId: string): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(NotificationMapper.toDomain);
  }
}
