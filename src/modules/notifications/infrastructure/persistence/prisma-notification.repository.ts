import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import {
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
      data: { status: props.status, errorMessage: props.errorMessage, sentAt: props.sentAt },
    });
    return NotificationMapper.toDomain(updated);
  }

  async existsForAppointment(
    appointmentId: string,
    type: NotificationType,
    channel: NotificationChannel,
    dedupeKey: string,
  ): Promise<boolean> {
    const count = await this.prisma.notification.count({
      where: { appointmentId, type, channel, dedupeKey },
    });
    return count > 0;
  }

  async findByAppointment(appointmentId: string): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(NotificationMapper.toDomain);
  }
}
