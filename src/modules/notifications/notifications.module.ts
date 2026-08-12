import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { EstablishmentsModule } from '../establishments/establishments.module';
import { ServicesModule } from '../services/services.module';
import { EmployeesModule } from '../employees/employees.module';
import { NotificationRepositoryPort } from './domain/notification.repository.port';
import { WhatsAppNotifierPort } from './domain/whatsapp-notifier.port';
import { EmailNotifierPort } from './domain/email-notifier.port';
import { PrismaNotificationRepository } from './infrastructure/persistence/prisma-notification.repository';
import { HttpWhatsAppNotifier } from './infrastructure/channels/http-whatsapp-notifier';
import { ResendEmailNotifier } from './infrastructure/channels/resend-email-notifier';
import { RemindersCron } from './infrastructure/reminders.cron';
import { RetryNotificationsCron } from './infrastructure/retry-notifications.cron';
import { NotificationDispatcherService } from './application/services/notification-dispatcher.service';
import { AppointmentEventsListener } from './application/listeners/appointment-events.listener';
import { DispatchDueRemindersUseCase } from './application/use-cases/dispatch-due-reminders.use-case';
import { RetryFailedNotificationsUseCase } from './application/use-cases/retry-failed-notifications.use-case';
import { ListAppointmentNotificationsUseCase } from './application/use-cases/list-appointment-notifications.use-case';
import { NotificationsController } from './presentation/notifications.controller';

@Module({
  // AppointmentsModule is imported here (one-directional) so the reminders cron and the
  // notifications-listing use case can read appointment data — AppointmentsModule itself
  // never imports NotificationsModule; it only emits events (see appointment-events.ts),
  // which is what keeps this from becoming a circular dependency.
  imports: [
    AppointmentsModule,
    ClientsModule,
    UsersModule,
    EstablishmentsModule,
    // Read-only: the rich HTML e-mail includes the service and professional names.
    ServicesModule,
    EmployeesModule,
  ],
  controllers: [NotificationsController],
  providers: [
    { provide: NotificationRepositoryPort, useClass: PrismaNotificationRepository },
    { provide: WhatsAppNotifierPort, useClass: HttpWhatsAppNotifier },
    { provide: EmailNotifierPort, useClass: ResendEmailNotifier },
    NotificationDispatcherService,
    AppointmentEventsListener,
    DispatchDueRemindersUseCase,
    RetryFailedNotificationsUseCase,
    ListAppointmentNotificationsUseCase,
    RemindersCron,
    RetryNotificationsCron,
  ],
  // WhatsAppNotifierPort/EmailNotifierPort are reused directly by WaitlistModule (Fase 6) —
  // a waitlist alert isn't anchored to an appointmentId, so it can't go through
  // NotificationDispatcherService/the notifications table, only through the raw channels.
  exports: [WhatsAppNotifierPort, EmailNotifierPort],
})
export class NotificationsModule {}
