import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { WhatsAppNotifierPort } from '../../domain/whatsapp-notifier.port';
import { EmailNotifierPort } from '../../domain/email-notifier.port';
import {
  Notification,
  NotificationChannel,
  NotificationType,
} from '../../domain/entities/notification.entity';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { ClientProfileRepositoryPort } from '../../../clients/domain/client-profile.repository.port';

export interface DispatchNotificationInput {
  type: NotificationType;
  establishmentId: string;
  appointmentId: string;
  clientId: string;
  startAt: Date;
  /** Required (and only used) for `cancellation`. */
  cancellationReason?: string;
}

const SUBJECTS: Record<NotificationType, string> = {
  confirmation: 'Confirmação de agendamento',
  reminder_24h: 'Lembrete de agendamento',
  reminder_2h: 'Lembrete de agendamento',
  cancellation: 'Cancelamento de agendamento',
};

/**
 * Central place that turns "something happened to an appointment" into zero or more
 * outbound messages. Used both synchronously (event listeners for confirmation/cancellation)
 * and from the reminders cron. Never throws — a channel failure is recorded as a `failed`
 * Notification row and logged, never propagated to the caller, since a notification problem
 * must never affect booking/cancellation or block the next cron tick.
 */
@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly clientProfileRepository: ClientProfileRepositoryPort,
    private readonly whatsAppNotifier: WhatsAppNotifierPort,
    private readonly emailNotifier: EmailNotifierPort,
  ) {}

  async dispatch(input: DispatchNotificationInput): Promise<void> {
    try {
      const client = await this.userRepository.findById(input.clientId);
      if (!client) {
        this.logger.warn(
          `Cliente '${input.clientId}' não encontrado — notificação '${input.type}' ignorada`,
        );
        return;
      }

      const clientProfile = await this.clientProfileRepository.findByUserAndEstablishment(
        input.clientId,
        input.establishmentId,
      );

      const message = this.buildMessage(input.type, input.startAt, input.cancellationReason);

      await this.dispatchChannel(input, 'email', client.email, message);
      if (clientProfile?.phone) {
        await this.dispatchChannel(input, 'whatsapp', clientProfile.phone, message);
      }
    } catch (error) {
      this.logger.error(
        `Falha inesperada ao despachar notificação '${input.type}' para o agendamento '${input.appointmentId}'`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async dispatchChannel(
    input: DispatchNotificationInput,
    channel: NotificationChannel,
    to: string,
    message: string,
  ): Promise<void> {
    const alreadySent = await this.notificationRepository.existsForAppointment(
      input.appointmentId,
      input.type,
      channel,
    );
    if (alreadySent) {
      return;
    }

    let notification = Notification.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      appointmentId: input.appointmentId,
      recipientUserId: input.clientId,
      channel,
      type: input.type,
      message,
    });
    notification = await this.notificationRepository.create(notification);

    try {
      if (channel === 'whatsapp') {
        await this.whatsAppNotifier.send(to, message);
      } else {
        await this.emailNotifier.send(to, SUBJECTS[input.type], message);
      }
      await this.notificationRepository.update(notification.markSent());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha ao enviar notificação '${input.type}' por ${channel} para '${to}': ${errorMessage}`,
      );
      await this.notificationRepository.update(notification.markFailed(errorMessage));
    }
  }

  private buildMessage(type: NotificationType, startAt: Date, cancellationReason?: string): string {
    const when = this.formatDateTime(startAt);
    switch (type) {
      case 'confirmation':
        return `Seu agendamento para ${when} foi confirmado.`;
      case 'reminder_24h':
        return `Lembrete: você tem um agendamento amanhã, ${when}.`;
      case 'reminder_2h':
        return `Lembrete: seu agendamento é hoje, ${when} (em cerca de 2 horas).`;
      case 'cancellation':
        return `Seu agendamento de ${when} foi cancelado. Motivo: ${cancellationReason ?? 'não informado'}.`;
    }
  }

  private formatDateTime(date: Date): string {
    return `${date.toISOString().slice(0, 10)} às ${date.toISOString().slice(11, 16)}`;
  }
}
