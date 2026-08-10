import { Controller, Get, Param, Query } from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { ListAppointmentNotificationsUseCase } from '../application/use-cases/list-appointment-notifications.use-case';
import { ListAppointmentNotificationsRequestDto } from './dto/list-appointment-notifications.request.dto';
import { Notification } from '../domain/entities/notification.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/notifications')
export class NotificationsController {
  constructor(private readonly listAppointmentNotifications: ListAppointmentNotificationsUseCase) {}

  @Get()
  @Auth('appointment:read')
  async list(
    @Param('establishmentId') establishmentId: string,
    @Query() query: ListAppointmentNotificationsRequestDto,
  ) {
    const notifications = await this.listAppointmentNotifications.execute({
      establishmentId,
      appointmentId: query.appointmentId,
    });
    return notifications.map((notification) => this.toResponse(notification));
  }

  private toResponse(notification: Notification) {
    return {
      id: notification.id,
      appointmentId: notification.appointmentId,
      recipientUserId: notification.recipientUserId,
      channel: notification.channel,
      type: notification.type,
      status: notification.status,
      message: notification.message,
      errorMessage: notification.errorMessage,
      sentAt: notification.sentAt,
    };
  }
}
